#![windows_subsystem = "windows"]
mod motion;
use motion::{Aim, Motion, Pose};
use std::{
    cell::RefCell,
    mem::{size_of, zeroed},
    ptr::{null, null_mut},
};
use windows_sys::Win32::{
    Foundation::*,
    Graphics::Gdi::*,
    System::LibraryLoader::GetModuleHandleW,
    UI::{Input::KeyboardAndMouse::*, WindowsAndMessaging::*},
};

const WIDTH: i32 = 120;
const HEIGHT: i32 = 150;
const ART_DENSITY: i32 = 5;
const ART_WIDTH: i32 = WIDTH * ART_DENSITY;
const ART_HEIGHT: i32 = HEIGHT * ART_DENSITY;
include!("../target/art/rig.rs");
const SIZES: [i32; 13] = [
    50, 75, 100, 125, 150, 175, 200, 250, 300, 350, 400, 450, 500,
];
const SIZE_COMMAND: usize = 10;
type Sprite = [u8; (ART_WIDTH * ART_HEIGHT * 4) as usize];
const BODY: &Sprite = include_bytes!("../target/art/body.rgba");
const HEAD: &Sprite = include_bytes!("../target/art/head.rgba");
const EYES: &Sprite = include_bytes!("../target/art/eyes.rgba");
#[derive(Default)]
struct State {
    drag: Option<(i32, i32)>,
    opacity: u8,
    size: i32,
    motion: Motion,
    animate: bool,
    last: Option<([i16; 7], u8)>,
}
thread_local! {static STATE: RefCell<State> = RefCell::new(State {opacity:255,size:100,..Default::default()});}
fn size_file() -> Option<std::path::PathBuf> {
    std::env::var_os("LOCALAPPDATA")
        .map(|base| std::path::PathBuf::from(base).join("FufuPet").join("size"))
}
fn read_size() -> i32 {
    size_file()
        .and_then(|path| std::fs::read_to_string(path).ok())
        .and_then(|text| text.trim().parse().ok())
        .filter(|value| SIZES.contains(value))
        .unwrap_or(100)
}
fn dimensions(percent: i32) -> (i32, i32) {
    (WIDTH * percent / 100, (HEIGHT * percent + 50) / 100)
}
fn wide(text: &str) -> Vec<u16> {
    text.encode_utf16().chain(Some(0)).collect()
}
fn blend(out: &mut [u8], layer: &Sprite, x: i32, y: i32) {
    if !(0..ART_WIDTH).contains(&x) || !(0..ART_HEIGHT).contains(&y) {
        return;
    }
    let pixel = &layer[((y * ART_WIDTH + x) * 4) as usize..];
    let alpha = pixel[3] as u32;
    if alpha == 0 {
        return;
    }
    if alpha == 255 {
        out[..4].copy_from_slice(&[pixel[2], pixel[1], pixel[0], 255]);
        return;
    }
    for (channel, source) in [2, 1, 0].iter().enumerate() {
        out[channel] = ((pixel[*source] as u32 * alpha + out[channel] as u32 * (255 - alpha) + 127)
            / 255) as u8;
    }
    out[3] = (alpha + (out[3] as u32 * (255 - alpha) + 127) / 255) as u8;
}
#[cfg(test)]
mod tests {
    use super::*;
    #[test]
    fn sprite_edges_are_transparent_and_sampling_is_bounded() {
        for sprite in [BODY, HEAD, EYES] {
            let mut pixel = [9, 12, 21, 30];
            for (x, y) in [(-1, 0), (0, -1), (ART_WIDTH, 0), (0, ART_HEIGHT), (0, 0)] {
                blend(&mut pixel, sprite, x, y);
            }
            assert_eq!(pixel, [9, 12, 21, 30]);
            assert!(sprite.chunks_exact(4).any(|pixel| pixel[3] == 255));
        }
    }
    #[test]
    fn both_eye_windows_stay_filled_at_maximum_gaze() {
        let travel_x = (ART_WIDTH as f32 * EYE_TRAVEL_X).ceil() as i32;
        let travel_y = (ART_HEIGHT as f32 * EYE_TRAVEL_Y).ceil() as i32;
        for (center_x, center_y) in [(270, 216), (335, 216)] {
            let alpha =
                |sprite: &Sprite, x: i32, y: i32| sprite[((y * ART_WIDTH + x) * 4 + 3) as usize];
            assert_eq!(alpha(HEAD, center_x, center_y), 0);
            for dx in [-travel_x, travel_x] {
                for dy in [-travel_y, travel_y] {
                    assert_eq!(alpha(EYES, center_x + dx, center_y + dy), 255);
                }
            }
        }
    }
    #[test]
    fn size_menu_covers_half_to_five_times_the_default() {
        assert_eq!(SIZES.first(), Some(&50));
        assert_eq!(SIZES.last(), Some(&500));
        assert_eq!(dimensions(50), (60, 75));
        assert_eq!(dimensions(100), (WIDTH, HEIGHT));
        assert_eq!(dimensions(200), (240, 300));
        assert_eq!(dimensions(500), (600, 750));
        assert_eq!(dimensions(500), (ART_WIDTH, ART_HEIGHT));
        for size in SIZES {
            let (width, height) = dimensions(size);
            assert!((width * HEIGHT - height * WIDTH).abs() <= WIDTH / 2);
        }
    }
}
unsafe fn draw(hwnd: HWND) {
    let mut rect: RECT = zeroed();
    GetWindowRect(hwnd, &mut rect);
    let mut pos: POINT = zeroed();
    GetCursorPos(&mut pos);
    let (width, height) = dimensions(STATE.with(|state| state.borrow().size));
    let pixel_scale = WIDTH as f32 / width as f32;
    let dx = (pos.x - rect.left) as f32 * pixel_scale - 60.;
    let dy = (pos.y - rect.top) as f32 * pixel_scale - HEIGHT as f32 * EYE_Y;
    let scale = dx.hypot(dy).max(75.);
    let frame = STATE.with(|state| {
        let mut state = state.borrow_mut();
        let animate = state.animate;
        let pose = state.motion.update(Aim(dx / scale, dy / scale), animate);
        let key = (pose.key(), state.opacity);
        if state.last == Some(key) {
            return None;
        }
        state.last = Some(key);
        Some((state.opacity, pose))
    });
    let Some((opacity, pose)) = frame else { return };
    let dc = CreateCompatibleDC(null_mut());
    if dc.is_null() {
        return;
    }
    let mut info: BITMAPINFO = zeroed();
    info.bmiHeader.biSize = size_of::<BITMAPINFOHEADER>() as u32;
    info.bmiHeader.biWidth = width;
    info.bmiHeader.biHeight = -height;
    info.bmiHeader.biPlanes = 1;
    info.bmiHeader.biBitCount = 32;
    let mut bits = null_mut();
    let bitmap = CreateDIBSection(dc, &info, DIB_RGB_COLORS, &mut bits, null_mut(), 0);
    if bitmap.is_null() {
        DeleteDC(dc);
        return;
    }
    let old = SelectObject(dc, bitmap);
    let pixels = std::slice::from_raw_parts_mut(bits as *mut u8, (width * height * 4) as usize);
    pixels.fill(0);
    let stance = pose.stance();
    let Pose {
        face: Aim(hx, hy),
        eyes: Aim(ex, ey),
        ..
    } = pose;
    let (sin, cos) = (hx * 2.5f32.to_radians()).sin_cos();
    for row in 0..height {
        for col in 0..width {
            let out = &mut pixels[((row * width + col) * 4) as usize..];
            let px = (col as f32 + 0.5) * pixel_scale;
            let py = (row as f32 + 0.5) * HEIGHT as f32 / height as f32;
            let (px, py) = stance.local(px, py);
            let sample = |coord: f32| (coord * ART_DENSITY as f32).floor() as i32;
            blend(out, BODY, sample(px), sample(py));
            let x = px - 60. - 0.54 * hx;
            let y = py - HEIGHT as f32 * NECK_Y - 0.525 * hy;
            let sx = 60. + cos * x + sin * y;
            let sy = HEIGHT as f32 * NECK_Y - sin * x + cos * y;
            blend(
                out,
                EYES,
                sample(sx - WIDTH as f32 * EYE_TRAVEL_X * ex),
                sample(sy - HEIGHT as f32 * EYE_TRAVEL_Y * ey),
            );
            blend(out, HEAD, sample(sx), sample(sy));
        }
    }
    let blend_fn = BLENDFUNCTION {
        BlendOp: AC_SRC_OVER as u8,
        BlendFlags: 0,
        SourceConstantAlpha: opacity,
        AlphaFormat: AC_SRC_ALPHA as u8,
    };
    UpdateLayeredWindow(
        hwnd,
        null_mut(),
        null(),
        &SIZE {
            cx: width,
            cy: height,
        },
        dc,
        &POINT { x: 0, y: 0 },
        0,
        &blend_fn,
        ULW_ALPHA,
    );
    SelectObject(dc, old);
    DeleteObject(bitmap);
    DeleteDC(dc);
}
unsafe fn resize_pet(hwnd: HWND, percent: i32) {
    let mut rect = zeroed();
    GetWindowRect(hwnd, &mut rect);
    let (width, height) = dimensions(percent);
    let mut left = rect.left;
    let mut top = rect.bottom - height;
    let mut monitor: MONITORINFO = zeroed();
    monitor.cbSize = size_of::<MONITORINFO>() as u32;
    if GetMonitorInfoW(
        MonitorFromWindow(hwnd, MONITOR_DEFAULTTONEAREST),
        &mut monitor,
    ) != 0
    {
        let area = monitor.rcWork;
        left = left.clamp(area.left, (area.right - width).max(area.left));
        top = top.clamp(area.top, (area.bottom - height).max(area.top));
    }
    SetWindowPos(
        hwnd,
        null_mut(),
        left,
        top,
        0,
        0,
        SWP_NOZORDER | SWP_NOSIZE | SWP_NOACTIVATE,
    );
    STATE.with(|state| {
        let mut state = state.borrow_mut();
        state.size = percent;
        state.last = None;
    });
    draw(hwnd);
    if let Some(path) = size_file() {
        if std::fs::create_dir_all(path.parent().unwrap()).is_ok() {
            let _ = std::fs::write(path, percent.to_string());
        }
    }
}
unsafe fn refresh_motion_setting() {
    let mut enabled: BOOL = 1;
    SystemParametersInfoW(
        SPI_GETCLIENTAREAANIMATION,
        0,
        (&mut enabled as *mut BOOL).cast(),
        0,
    );
    STATE.with(|state| state.borrow_mut().animate = enabled != 0);
}
unsafe extern "system" fn procedure(hwnd: HWND, msg: u32, wp: WPARAM, lp: LPARAM) -> LRESULT {
    let mut pos: POINT = zeroed();
    match msg {
        WM_TIMER => draw(hwnd),
        WM_SETTINGCHANGE => refresh_motion_setting(),
        WM_LBUTTONDOWN => {
            GetCursorPos(&mut pos);
            let mut rect = zeroed();
            GetWindowRect(hwnd, &mut rect);
            STATE.with(|state| {
                state.borrow_mut().drag = Some((pos.x - rect.left, pos.y - rect.top))
            });
            SetCapture(hwnd);
        }
        WM_MOUSEMOVE => {
            if let Some((dx, dy)) = STATE.with(|state| state.borrow().drag) {
                GetCursorPos(&mut pos);
                SetWindowPos(
                    hwnd,
                    null_mut(),
                    pos.x - dx,
                    pos.y - dy,
                    0,
                    0,
                    SWP_NOSIZE | SWP_NOACTIVATE | SWP_NOZORDER,
                );
            }
        }
        WM_LBUTTONUP => {
            ReleaseCapture();
        }
        WM_CAPTURECHANGED => STATE.with(|state| state.borrow_mut().drag = None),
        WM_RBUTTONUP => {
            GetCursorPos(&mut pos);
            let menu = CreatePopupMenu();
            let sizes = CreatePopupMenu();
            let current = STATE.with(|state| state.borrow().size);
            for (index, percent) in SIZES.iter().enumerate() {
                let flags = if *percent == current { MF_CHECKED } else { 0 };
                AppendMenuW(
                    sizes,
                    MF_STRING | flags,
                    SIZE_COMMAND + index,
                    wide(&format!("{percent}%")).as_ptr(),
                );
            }
            AppendMenuW(menu, MF_POPUP, sizes as usize, wide("大小").as_ptr());
            for (id, text) in [
                (1, "透明度 25%"),
                (2, "透明度 50%"),
                (3, "透明度 75%"),
                (4, "透明度 100%"),
                (5, "退出小小芙"),
            ] {
                AppendMenuW(menu, MF_STRING, id, wide(text).as_ptr());
            }
            SetForegroundWindow(hwnd);
            TrackPopupMenu(menu, TPM_RIGHTBUTTON, pos.x, pos.y, 0, hwnd, null());
            DestroyMenu(menu);
        }
        WM_COMMAND => {
            let id = wp & 0xffff;
            if id == 5 {
                DestroyWindow(hwnd);
            } else if (1..=4).contains(&id) {
                STATE.with(|state| state.borrow_mut().opacity = (id * 255 / 4) as u8);
                draw(hwnd);
            } else if let Some(percent) = id
                .checked_sub(SIZE_COMMAND)
                .and_then(|index| SIZES.get(index))
            {
                resize_pet(hwnd, *percent);
            }
        }
        WM_DESTROY => {
            PostQuitMessage(0);
        }
        _ => return DefWindowProcW(hwnd, msg, wp, lp),
    }
    0
}
fn main() {
    unsafe {
        SetProcessDPIAware();
        refresh_motion_setting();
        let instance = GetModuleHandleW(null());
        let name = wide("FufuDesktopPet");
        let mut class: WNDCLASSW = zeroed();
        class.lpfnWndProc = Some(procedure);
        class.hInstance = instance;
        class.lpszClassName = name.as_ptr();
        class.hCursor = LoadCursorW(null_mut(), IDC_HAND);
        assert_ne!(RegisterClassW(&class), 0);
        let mut area: RECT = zeroed();
        SystemParametersInfoW(SPI_GETWORKAREA, 0, (&mut area as *mut RECT).cast(), 0);
        let percent = read_size();
        STATE.with(|state| state.borrow_mut().size = percent);
        let (width, height) = dimensions(percent);
        let window = CreateWindowExW(
            WS_EX_LAYERED | WS_EX_TOPMOST | WS_EX_TOOLWINDOW,
            name.as_ptr(),
            wide("小小芙").as_ptr(),
            WS_POPUP,
            area.left + 12,
            area.bottom - height - 12,
            width,
            height,
            null_mut(),
            null_mut(),
            instance,
            null(),
        );
        assert!(!window.is_null());
        draw(window);
        ShowWindow(window, SW_SHOWNOACTIVATE);
        SetTimer(window, 1, 32, None);
        let mut msg = zeroed();
        while GetMessageW(&mut msg, null_mut(), 0, 0) > 0 {
            TranslateMessage(&msg);
            DispatchMessageW(&msg);
        }
    }
}
