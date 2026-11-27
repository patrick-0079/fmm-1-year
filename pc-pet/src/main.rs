#![windows_subsystem = "windows"]
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
type Sprite = [u8; 120 * 150 * 4];
const BODY: &Sprite = include_bytes!("../target/art/body.rgba");
const HEAD: &Sprite = include_bytes!("../target/art/head.rgba");
const EYES: &Sprite = include_bytes!("../target/art/eyes.rgba");
#[derive(Default)]
struct State {
    drag: Option<(i32, i32)>,
    opacity: u8,
    last: Option<(i32, i32, u8)>,
}
thread_local! {static STATE: RefCell<State> = RefCell::new(State {opacity:255,..Default::default()});}
fn wide(text: &str) -> Vec<u16> {
    text.encode_utf16().chain(Some(0)).collect()
}
fn blend(out: &mut [u8], layer: &Sprite, x: i32, y: i32) {
    if !(0..WIDTH).contains(&x) || !(0..HEIGHT).contains(&y) {
        return;
    }
    let pixel = &layer[((y * WIDTH + x) * 4) as usize..];
    let alpha = pixel[3] as u32;
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
            for (x, y) in [(-1, 0), (0, -1), (WIDTH, 0), (0, HEIGHT), (0, 0)] {
                blend(&mut pixel, sprite, x, y);
            }
            assert_eq!(pixel, [9, 12, 21, 30]);
            assert!(sprite.chunks_exact(4).any(|pixel| pixel[3] == 255));
        }
    }
}
unsafe fn draw(hwnd: HWND) {
    let mut rect: RECT = zeroed();
    GetWindowRect(hwnd, &mut rect);
    let mut pos: POINT = zeroed();
    GetCursorPos(&mut pos);
    let dx = (pos.x - rect.left - 60) as f32;
    let dy = (pos.y - rect.top - 62) as f32;
    let scale = dx.hypot(dy).max(75.);
    let (hx, hy) = (dx / scale, dy / scale);
    let opacity = STATE.with(|state| {
        let mut state = state.borrow_mut();
        let key = (
            (hx * 30.).round() as i32,
            (hy * 30.).round() as i32,
            state.opacity,
        );
        if state.last == Some(key) {
            return None;
        }
        state.last = Some(key);
        Some(state.opacity)
    });
    let Some(opacity) = opacity else { return };
    let dc = CreateCompatibleDC(null_mut());
    if dc.is_null() {
        return;
    }
    let mut info: BITMAPINFO = zeroed();
    info.bmiHeader.biSize = size_of::<BITMAPINFOHEADER>() as u32;
    info.bmiHeader.biWidth = WIDTH;
    info.bmiHeader.biHeight = -HEIGHT;
    info.bmiHeader.biPlanes = 1;
    info.bmiHeader.biBitCount = 32;
    let mut bits = null_mut();
    let bitmap = CreateDIBSection(dc, &info, DIB_RGB_COLORS, &mut bits, null_mut(), 0);
    if bitmap.is_null() {
        DeleteDC(dc);
        return;
    }
    let old = SelectObject(dc, bitmap);
    let pixels = std::slice::from_raw_parts_mut(bits as *mut u8, (WIDTH * HEIGHT * 4) as usize);
    pixels.fill(0);
    let (sin, cos) = (hx * 5f32.to_radians()).sin_cos();
    for row in 0..HEIGHT {
        for col in 0..WIDTH {
            let out = &mut pixels[((row * WIDTH + col) * 4) as usize..];
            blend(out, BODY, col, row);
            let x = col as f32 - 60. - 3.6 * hx;
            let y = row as f32 - 81. - 3. * hy;
            let sx = 60. + cos * x + sin * y;
            let sy = 81. - sin * x + cos * y;
            blend(out, HEAD, sx.round() as i32, sy.round() as i32);
            blend(
                out,
                EYES,
                (sx - 2.4 * hx).round() as i32,
                (sy - 1.5 * hy).round() as i32,
            );
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
            cx: WIDTH,
            cy: HEIGHT,
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
unsafe extern "system" fn procedure(hwnd: HWND, msg: u32, wp: WPARAM, lp: LPARAM) -> LRESULT {
    let mut pos: POINT = zeroed();
    match msg {
        WM_TIMER => draw(hwnd),
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
            let id = TrackPopupMenu(
                menu,
                TPM_RETURNCMD | TPM_RIGHTBUTTON,
                pos.x,
                pos.y,
                0,
                hwnd,
                null(),
            );
            DestroyMenu(menu);
            if id == 5 {
                DestroyWindow(hwnd);
            } else if (1..=4).contains(&id) {
                STATE.with(|state| state.borrow_mut().opacity = (id * 255 / 4) as u8);
                draw(hwnd);
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
        let window = CreateWindowExW(
            WS_EX_LAYERED | WS_EX_TOPMOST | WS_EX_TOOLWINDOW,
            name.as_ptr(),
            wide("小小芙").as_ptr(),
            WS_POPUP,
            area.left + 12,
            area.bottom - HEIGHT - 12,
            WIDTH,
            HEIGHT,
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
