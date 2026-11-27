use std::time::Instant;

#[derive(Clone, Copy, Default)]
pub struct Aim(pub f32, pub f32);

impl Aim {
    fn follow(&mut self, target: Aim, weight: f32) {
        self.0 += (target.0 - self.0) * weight;
        self.1 += (target.1 - self.1) * weight;
    }
}

#[derive(Clone, Copy, Default)]
pub struct Pose {
    pub body: Aim,
    pub face: Aim,
    pub eyes: Aim,
    pub breath: f32,
}

impl Pose {
    fn advance(&mut self, target: Aim, elapsed: f32, age: f32) {
        for (joint, response) in [
            (&mut self.body, 9.),
            (&mut self.face, 19.),
            (&mut self.eyes, 38.),
        ] {
            joint.follow(target, 1. - (-response * elapsed).exp());
        }
        self.breath = 0.5 + 0.5 * (age * std::f32::consts::TAU / 7.6).cos();
    }

    pub fn key(self) -> [i16; 7] {
        [
            self.body.0,
            self.body.1,
            self.face.0,
            self.face.1,
            self.eyes.0,
            self.eyes.1,
            self.breath,
        ]
        .map(|value| (value * 48.).round() as i16)
    }

    pub fn stance(self) -> Stance {
        let tilt = 4. * self.body.0 - 1.1 * self.breath;
        let (sin, cos) = tilt.to_radians().sin_cos();
        let width = 1. + 0.01 * self.breath;
        let height = (1. - 0.013 * self.body.1) * (1. - 0.02 * self.breath);
        Stance {
            xx: cos / width,
            xy: sin / width,
            yx: -sin / height,
            yy: cos / height,
        }
    }
}

pub struct Stance {
    xx: f32,
    xy: f32,
    yx: f32,
    yy: f32,
}

impl Stance {
    pub fn local(&self, px: f32, py: f32) -> (f32, f32) {
        let dx = px - 60.;
        let dy = py - 144.;
        (
            60. + self.xx * dx + self.xy * dy,
            144. + self.yx * dx + self.yy * dy,
        )
    }
}

pub struct Motion {
    start: Instant,
    previous: Instant,
    pose: Pose,
}

impl Default for Motion {
    fn default() -> Self {
        let now = Instant::now();
        Self {
            start: now,
            previous: now,
            pose: Pose::default(),
        }
    }
}

impl Motion {
    pub fn update(&mut self, target: Aim, animate: bool) -> Pose {
        let now = Instant::now();
        if animate {
            self.pose.advance(
                target,
                (now - self.previous).as_secs_f32(),
                (now - self.start).as_secs_f32(),
            );
        } else {
            self.pose = Pose::default();
        }
        self.previous = now;
        self.pose
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    #[test]
    fn eyes_lead_the_head_and_body() {
        let mut pose = Pose::default();
        pose.advance(Aim(1., -1.), 0.032, 0.);
        assert!(0. < pose.body.0 && pose.body.0 < pose.face.0 && pose.face.0 < pose.eyes.0);
        assert!(pose.eyes.0 < 1. && pose.body.1 < 0.);
    }
    #[test]
    fn shoulders_breathe_while_the_feet_stay_planted() {
        let mut pose = Pose::default();
        pose.advance(Aim(0., 0.), 0.032, 0.);
        let exhale = pose.stance();
        pose.advance(Aim(0., 0.), 0.032, 3.8);
        let inhale = pose.stance();
        assert_eq!(exhale.local(60., 144.), inhale.local(60., 144.));
        assert!((exhale.local(60., 92.).1 - inhale.local(60., 92.).1).abs() > 0.9);
    }
}
