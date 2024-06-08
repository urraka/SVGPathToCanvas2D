const PARAMS_COUNT = getParamsCount();

function Command(cmd, ...args) {
    this.cmd = cmd;
    this.args = args;
}

export function SVGPathToCanvas2D(d) {
    const state = { cmdPrev: null, x: 0, y: 0, cpx: 0, cpy: 0, mx: 0, my: 0 };
    return parse(d).reduce((result, { cmd, v }) => {
        const P = PARAMS_COUNT[cmd] || 0;
        const N = P > 0 ? v.length / P : 1;
        for (let i = 0; i < N; i++) {
            const params = v.slice(i * P, (i + 1) * P);
            const command = getNextCommand(cmd, params, state);
            result.push(command);
            state.cmdPrev = cmd;
            if (cmd === "M") cmd = "L";
            else if (cmd === "m") cmd = "l";
        }
        return result;
    }, []);
}

function parse(d) {
    return d.match(/([MLQTCSAZVH])([^MLQTCSAZVH]*)/gi).map(s => ({
        cmd: s[0],
        v: s.slice(1).trim().split(/[\s,]+/)
            .flatMap(s => s.match(/(?:-|\+)?\d*(?:\.?\d+)/gy))
            .map(x => Number(x))
    }));
}

function getParamsCount() {
    return [
        [1, "HhVv"],
        [2, "MmLlTt"],
        [4, "SsQq"],
        [6, "Cc"],
        [7, "Aa"],
    ].reduce((res, [n, cmds]) => (cmds.split("").forEach(cmd => (res[cmd] = n)), res), {});
}

function getNextCommand(cmd, params, state) {
    const cmdu = cmd.toUpperCase();
    const rel = cmd !== cmdu;
    const x0 = state.x;
    const y0 = state.y;

    switch (cmdu) {
        case "M": case "L": case "H": case "V": {
            let x = cmdu === "V" ? null : params[0];
            let y = cmdu === "H" ? null : params[cmdu === "V" ? 0 : 1];
            if (rel && x !== null) x += x0;
            if (rel && y !== null) y += y0;
            if (x === null) x = x0;
            if (y === null) y = y0;
            state.x = x;
            state.y = y;
            if (cmdu === "M") {
                state.mx = x;
                state.my = y;
            }
            return new Command(cmdu === "M" ? "M" : "L", x, y);
        }
        case "C": {
            let [cp1x, cp1y, cp2x, cp2y, x, y] = params;
            if (rel) {
                x += x0;
                y += y0;
                cp1x += x0;
                cp1y += y0;
                cp2x += x0;
                cp2y += y0;
            }
            state.x = x;
            state.y = y;
            state.cpx = cp2x;
            state.cpy = cp2y;
            return new Command("C", cp1x, cp1y, cp2x, cp2y, x, y);
        }
        case "S": {
            let cp1x = x0;
            let cp1y = y0;
            let [cp2x, cp2y, x, y] = params;
            if (rel) {
                x += x0;
                y += y0;
                cp2x += x0;
                cp2y += y0;
            }
            if ("CcSs".includes(state.cmdPrev)) {
                cp1x = 2 * x0 - state.cpx;
                cp1y = 2 * y0 - state.cpy;
            }
            state.x = x;
            state.y = y;
            state.cpx = cp2x;
            state.cpy = cp2y;
            return new Command("C", cp1x, cp1y, cp2x, cp2y, x, y);
        }
        case "Q": {
            let [cpx, cpy, x, y] = params;
            if (rel) {
                x += x0;
                y += y0;
                cpx += x0;
                cpy += y0;
            }
            state.x = x;
            state.y = y;
            state.cpx = cpx;
            state.cpy = cpy;
            return new Command("Q", cpx, cpy, x, y);
        }
        case "T": {
            let cpx = x0;
            let cpy = y0;
            let [x, y] = params;
            if (rel) {
                x += x0;
                y += y0;
            }
            if ("QqTt".includes(state.cmdPrev)) {
                cpx = 2 * x0 - state.cpx;
                cpy = 2 * y0 - state.cpy;
            }
            state.x = x;
            state.y = y;
            state.cpx = cpx;
            state.cpy = cpy;
            return new Command("Q", cpx, cpy, x, y);
        }
        case "A": {
            let [rx, ry, angle, fa, fs, x, y] = params;
            if (rel) {
                x += x0;
                y += y0;
            }
            state.x = x;
            state.y = y;
            return arc(x0, y0, x, y, fa, fs, rx, ry, angle / 180 * Math.PI);
        }
        case "Z": {
            state.x = state.mx;
            state.y = state.my;
            return new Command("Z");
        }
        default: return null;
    }
}

function arc(x1, y1, x2, y2, fa, fs, rx, ry, angle) {
    const cosθ = Math.cos(angle);
    const sinθ = Math.sin(angle);
    const x11 =  (x1 - x2) / 2 * cosθ + (y1 - y2) / 2 * sinθ;
    const y11 =  (y1 - y2) / 2 * cosθ - (x1 - x2) / 2 * sinθ;
    const x11x11 = x11 * x11;
    const y11y11 = y11 * y11;
    const rs = x11x11 / (rx*rx) + y11y11 / (ry*ry);
    if (rs > 1) {
        const qrs = Math.sqrt(rs);
        rx = rx * qrs;
        ry = ry * qrs;
    }
    const c_symbol = fa !== fs ? 1 : -1;
    const rxrx = rx * rx;
    const ryry = ry * ry;
    const a =  rxrx * ryry - rxrx * y11y11 - ryry * x11x11;
    const b = rxrx * y11y11 + ryry * x11x11;
    const qab = Math.sqrt(Math.abs(a / b));
    const cx1 = c_symbol * (rx * y11 / ry) * qab;
    const cy1 = c_symbol * (-ry * x11 / rx) * qab;
    const cx = cx1 * cosθ - cy1 * sinθ + (x1 + x2) / 2;
    const cy = cx1 * sinθ + cy1 * cosθ + (y1 + y2) / 2;

    let ux = 1;
    let uy = 0;
    let vx = (x11 - cx1) / rx;
    let vy = (y11 - cy1) / ry;
    let θ1 = Math.acos((ux * vx) / (Math.sqrt(ux*ux) * Math.sqrt((vx*vx) + (vy*vy))));
    if (ux * vy < 0) θ1 = -θ1;
    ux = (x11 - cx1) / rx;
    uy = (y11 - cy1) / ry;
    vx = (-x11 - cx1) / rx;
    vy = (-y11 - cy1) / ry;
    let Δθ = Math.acos((ux * vx + uy * vy) / (Math.sqrt((ux*ux) + (uy*uy)) * Math.sqrt((vx*vx) + (vy*vy))));
    if (ux * vy - uy * vx < 0) Δθ = -Δθ;
    return new Command("A", cx, cy, rx, ry, angle, θ1, θ1 + Δθ, !fs);
}
