var __defProp = Object.defineProperty;
var __getOwnPropSymbols = Object.getOwnPropertySymbols;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __propIsEnum = Object.prototype.propertyIsEnumerable;
var __defNormalProp = (obj, key, value) => key in obj ? __defProp(obj, key, { enumerable: true, configurable: true, writable: true, value }) : obj[key] = value;
var __spreadValues = (a, b) => {
  for (var prop in b || (b = {}))
    if (__hasOwnProp.call(b, prop))
      __defNormalProp(a, prop, b[prop]);
  if (__getOwnPropSymbols)
    for (var prop of __getOwnPropSymbols(b)) {
      if (__propIsEnum.call(b, prop))
        __defNormalProp(a, prop, b[prop]);
    }
  return a;
};

// src/util.ts
function modulo(n1, n2) {
  return (n1 % n2 + n2) % n2;
}

// src/index.ts
var SEGMENT_TYPES = {
  LEFT: 1,
  STRAIGHT: 2,
  RIGHT: 3
};
var PATH_TYPES = {
  LSL: {
    calc: function LSL(alpha, beta, d) {
      let tmp0 = d + Math.sin(alpha) - Math.sin(beta);
      let tmp1 = Math.atan2(Math.cos(beta) - Math.cos(alpha), tmp0);
      let pSquared = 2 + d * d - 2 * Math.cos(alpha - beta) + 2 * d * (Math.sin(alpha) - Math.sin(beta));
      if (pSquared < 0) {
        return [-1, -1, -1];
      } else {
        return [
          modulo(tmp1 - alpha, 2 * Math.PI),
          Math.sqrt(pSquared),
          modulo(beta - tmp1, 2 * Math.PI)
        ];
      }
    },
    segments: [SEGMENT_TYPES.LEFT, SEGMENT_TYPES.STRAIGHT, SEGMENT_TYPES.LEFT]
  },
  LSR: {
    calc: function LSR(alpha, beta, d) {
      let tmp0 = d + Math.sin(alpha) + Math.sin(beta);
      let pSquared = -2 + d * d + 2 * Math.cos(alpha - beta) + 2 * d * (Math.sin(alpha) + Math.sin(beta));
      if (pSquared < 0) {
        return [-1, -1, -1];
      } else {
        let p = Math.sqrt(pSquared);
        let tmp2 = Math.atan2(-1 * Math.cos(alpha) - Math.cos(beta), tmp0) - Math.atan2(-2, p);
        let t = modulo(tmp2 - alpha, 2 * Math.PI);
        let q = modulo(tmp2 - beta, 2 * Math.PI);
        return [t, p, q];
      }
    },
    segments: [SEGMENT_TYPES.LEFT, SEGMENT_TYPES.STRAIGHT, SEGMENT_TYPES.RIGHT]
  },
  RSL: {
    calc: function RSL(alpha, beta, d) {
      let tmp0 = d - Math.sin(alpha) - Math.sin(beta);
      let pSquared = -2 + d * d + 2 * Math.cos(alpha - beta) - 2 * d * (Math.sin(alpha) + Math.sin(beta));
      if (pSquared < 0) {
        return [-1, -1, -1];
      } else {
        let p = Math.sqrt(pSquared);
        let tmp2 = Math.atan2(Math.cos(alpha) + Math.cos(beta), tmp0) - Math.atan2(2, p);
        let t = modulo(alpha - tmp2, 2 * Math.PI);
        let q = modulo(beta - tmp2, 2 * Math.PI);
        return [t, p, q];
      }
    },
    segments: [SEGMENT_TYPES.RIGHT, SEGMENT_TYPES.STRAIGHT, SEGMENT_TYPES.LEFT]
  },
  RSR: {
    calc: function RSR(alpha, beta, d) {
      let tmp0 = d - Math.sin(alpha) + Math.sin(beta);
      let tmp1 = Math.atan2(Math.cos(alpha) - Math.cos(beta), tmp0);
      let pSquared = 2 + d * d - 2 * Math.cos(alpha - beta) + 2 * d * (Math.sin(beta) - Math.sin(alpha));
      if (pSquared < 0) {
        return [-1, -1, -1];
      } else {
        let t = modulo(alpha - tmp1, 2 * Math.PI);
        let p = Math.sqrt(pSquared);
        let q = modulo(-1 * beta + tmp1, 2 * Math.PI);
        return [t, p, q];
      }
    },
    segments: [SEGMENT_TYPES.RIGHT, SEGMENT_TYPES.STRAIGHT, SEGMENT_TYPES.RIGHT]
  },
  RLR: {
    calc: function RLR(alpha, beta, d) {
      let tmpRlr = (6 - d * d + 2 * Math.cos(alpha - beta) + 2 * d * (Math.sin(alpha) - Math.sin(beta))) / 8;
      if (Math.abs(tmpRlr) > 1) {
        return [-1, -1, -1];
      } else {
        let p = modulo(2 * Math.PI - Math.acos(tmpRlr), 2 * Math.PI);
        let t = modulo(alpha - Math.atan2(Math.cos(alpha) - Math.cos(beta), d - Math.sin(alpha) + Math.sin(beta)) + modulo(p / 2, 2 * Math.PI), 2 * Math.PI);
        let q = modulo(alpha - beta - t + modulo(p, 2 * Math.PI), 2 * Math.PI);
        return [t, p, q];
      }
    },
    segments: [SEGMENT_TYPES.RIGHT, SEGMENT_TYPES.LEFT, SEGMENT_TYPES.RIGHT]
  },
  LRL: {
    calc: function LRL(alpha, beta, d) {
      let tmpLrl = (6 - d * d + 2 * Math.cos(alpha - beta) + 2 * d * (-1 * Math.sin(alpha) + Math.sin(beta))) / 8;
      if (Math.abs(tmpLrl) > 1) {
        return [-1, -1, -1];
      } else {
        let p = modulo(2 * Math.PI - Math.acos(tmpLrl), 2 * Math.PI);
        let t = modulo(-1 * alpha - Math.atan2(Math.cos(alpha) - Math.cos(beta), d + Math.sin(alpha) - Math.sin(beta)) + p / 2, 2 * Math.PI);
        let q = modulo(modulo(beta, 2 * Math.PI) - alpha - t + modulo(p, 2 * Math.PI), 2 * Math.PI);
        return [t, p, q];
      }
    },
    segments: [SEGMENT_TYPES.LEFT, SEGMENT_TYPES.RIGHT, SEGMENT_TYPES.LEFT]
  }
};
var SEGMENT_ORDER = [
  "LSL",
  "LSR",
  "RSL",
  "RSR",
  "RLR",
  "LRL"
];
function map(num, inMin, inMax, outMin, outMax) {
  return (num - inMin) * (outMax - outMin) / (inMax - inMin) + outMin;
}
var Dubins = class {
  constructor(segments, turnRadius) {
    this.segments = segments;
    this.turnRadius = turnRadius;
  }
  curves(wpt1, wpt2, turnRadius) {
    throw new Error("Untested! Please test this before allowing use in the API.");
    wpt1 = __spreadValues({}, wpt1);
    wpt2 = __spreadValues({}, wpt2);
    let tz = [0, 0, 0, 0, 0, 0];
    let pz = [0, 0, 0, 0, 0, 0];
    let qz = [0, 0, 0, 0, 0, 0];
    let psi1 = wpt1.psi;
    let psi2 = wpt2.psi;
    let dx = wpt2.x - wpt1.x;
    let dy = wpt2.y - wpt1.y;
    let D = Math.sqrt(dx * dx + dy * dy);
    let d = D / turnRadius;
    let theta = modulo(Math.atan2(dy, dx), 2 * Math.PI);
    let alpha = modulo(psi1 - theta, 2 * Math.PI);
    let beta = modulo(psi2 - theta, 2 * Math.PI);
    let bestWord = -1;
    let bestCost = -1;
    let orderedFns = SEGMENT_ORDER.map((key) => PATH_TYPES[key].calc);
    for (let i = 0; i < orderedFns.length; i++) {
      const [t, p, q] = orderedFns[i](alpha, beta, d);
      tz[i] = t;
      pz[i] = p;
      qz[i] = q;
    }
    let curves = [];
    for (let x = 0; x < 6; x++) {
      if (tz[x] === -1) {
        continue;
      }
      const segments = [];
      let segmentStart = wpt1;
      for (let i in PATH_TYPES[SEGMENT_ORDER[bestWord]].segments) {
        let type = PATH_TYPES[SEGMENT_ORDER[bestWord]].segments[i];
        let newSegment = new Segment(type, segmentStart, turnRadius, [tz, pz, qz][i][bestWord]);
        segments.push(newSegment);
        segmentStart = newSegment.absolutePointAt(newSegment.tprimeMax);
      }
      curves.push(new Dubins(segments, turnRadius));
    }
    return curves;
  }
  static path(wpt1, wpt2, turnRadius) {
    let tz = [0, 0, 0, 0, 0, 0];
    let pz = [0, 0, 0, 0, 0, 0];
    let qz = [0, 0, 0, 0, 0, 0];
    let psi1 = wpt1.psi;
    let psi2 = wpt2.psi;
    let dx = wpt2.x - wpt1.x;
    let dy = wpt2.y - wpt1.y;
    let D = Math.sqrt(dx * dx + dy * dy);
    let d = D / turnRadius;
    let theta = modulo(Math.atan2(dy, dx), 2 * Math.PI);
    let alpha = modulo(psi1 - theta, 2 * Math.PI);
    let beta = modulo(psi2 - theta, 2 * Math.PI);
    let bestWord = -1;
    let bestCost = -1;
    let orderedFns = SEGMENT_ORDER.map((key) => PATH_TYPES[key].calc);
    for (let i = 0; i < orderedFns.length; i++) {
      const [t, p, q] = orderedFns[i](alpha, beta, d);
      tz[i] = t;
      pz[i] = p;
      qz[i] = q;
    }
    let cost;
    for (let x = 0; x < 6; x++) {
      if (tz[x] != -1) {
        cost = tz[x] + pz[x] + qz[x];
        if (cost < bestCost || bestCost == -1) {
          bestWord = x;
          bestCost = cost;
        }
      }
    }
    const segments = [];
    let segmentStart = wpt1;
    for (let i in PATH_TYPES[SEGMENT_ORDER[bestWord]].segments) {
      let type = PATH_TYPES[SEGMENT_ORDER[bestWord]].segments[i];
      let newSegment = new Segment(type, segmentStart, turnRadius, [tz, pz, qz][i][bestWord]);
      segments.push(newSegment);
      segmentStart = newSegment.absolutePointAt(newSegment.tprimeMax);
    }
    return new Dubins(segments, turnRadius);
  }
  get tprimeMax() {
    return this.segments[0].tprimeMax + this.segments[1].tprimeMax + this.segments[2].tprimeMax;
  }
  get length() {
    return Math.floor(this.tprimeMax * this.turnRadius);
  }
  pointAt(pos) {
    if (pos > 1) {
      throw new Error(`Cannot get point at pos > 1 (${pos})`);
    }
    let tprime = map(pos, 0, 1, 0, this.tprimeMax);
    if (tprime < this.segments[0].tprimeMax) {
      return this.segments[0].absolutePointAt(tprime);
    } else if (tprime - this.segments[0].tprimeMax < this.segments[1].tprimeMax) {
      return this.segments[1].absolutePointAt(tprime - this.segments[0].tprimeMax);
    } else {
      return this.segments[2].absolutePointAt(tprime - this.segments[0].tprimeMax - this.segments[1].tprimeMax);
    }
  }
  pointAtLength(length) {
    if (length > this.length) {
      throw new Error("length exceeds unit length");
    }
    let tprime = length / this.turnRadius;
    if (tprime < this.segments[0].tprimeMax) {
      return this.segments[0].absolutePointAt(tprime);
    } else if (tprime - this.segments[0].tprimeMax < this.segments[1].tprimeMax) {
      return this.segments[1].absolutePointAt(tprime - this.segments[0].tprimeMax);
    } else {
      return this.segments[2].absolutePointAt(tprime - this.segments[0].tprimeMax - this.segments[1].tprimeMax);
    }
  }
  toObject() {
    return {
      segments: this.segments.map((segment) => segment.toObject()),
      turnRadius: this.turnRadius,
      length: this.length,
      tprimeMax: this.tprimeMax
    };
  }
};
var Segment = class {
  constructor(type, startPoint, turnRadius, tprimeMax) {
    this.type = type;
    this.startPoint = startPoint;
    this.turnRadius = turnRadius;
    this.tprimeMax = tprimeMax;
  }
  get length() {
    return Math.floor(this.tprimeMax * this.turnRadius);
  }
  get center() {
    let result = {
      x: this.startPoint.x,
      y: this.startPoint.y
    };
    if (this.type === SEGMENT_TYPES.STRAIGHT) {
      let endPoint = this.absolutePointAt(this.tprimeMax);
      result.x += endPoint.x;
      result.x /= 2;
      result.y += endPoint.y;
      result.y /= 2;
    } else {
      let angleFromCenter = this.startPoint.psi + Math.PI / 2 * (this.type === SEGMENT_TYPES.LEFT ? -1 : 1);
      result.x -= Math.cos(angleFromCenter) * this.turnRadius;
      result.y -= Math.sin(angleFromCenter) * this.turnRadius;
    }
    return result;
  }
  get arcAngles() {
    if (this.type === SEGMENT_TYPES.STRAIGHT)
      return void 0;
    let start = this.startPoint.psi + Math.PI / 2 * (this.type === SEGMENT_TYPES.LEFT ? -1 : 1);
    let end = this.absolutePointAt(this.tprimeMax).psi + Math.PI / 2 * (this.type === SEGMENT_TYPES.LEFT ? -1 : 1);
    return {
      start,
      end
    };
  }
  pointAt(pos) {
    if (pos > 1) {
      throw new Error(`Cannot get point at pos > 1 (${pos})`);
    }
    let tprime = Math.min(map(pos, 0, 1, 0, this.tprimeMax), this.tprimeMax);
    return this.absolutePointAt(tprime);
  }
  pointAtLength(length) {
    if (length > this.length) {
      throw new Error("length exceeds unit length");
    }
    let tprime = Math.min(length / this.turnRadius, this.tprimeMax);
    return this.absolutePointAt(tprime);
  }
  absolutePointAt(tprime) {
    const point = {
      x: 0,
      y: 0,
      psi: 0
    };
    if (this.type == SEGMENT_TYPES.LEFT) {
      point.x = this.startPoint.x + (Math.sin(this.startPoint.psi + tprime) - Math.sin(this.startPoint.psi)) * this.turnRadius;
      point.y = this.startPoint.y + (-Math.cos(this.startPoint.psi + tprime) + Math.cos(this.startPoint.psi)) * this.turnRadius;
      point.psi = this.startPoint.psi + tprime;
    } else if (this.type == SEGMENT_TYPES.RIGHT) {
      point.x = this.startPoint.x + (-Math.sin(this.startPoint.psi - tprime) + Math.sin(this.startPoint.psi)) * this.turnRadius;
      point.y = this.startPoint.y + (Math.cos(this.startPoint.psi - tprime) - Math.cos(this.startPoint.psi)) * this.turnRadius;
      point.psi = this.startPoint.psi - tprime;
    } else if (this.type == SEGMENT_TYPES.STRAIGHT) {
      point.x = this.startPoint.x + Math.cos(this.startPoint.psi) * tprime * this.turnRadius;
      point.y = this.startPoint.y + Math.sin(this.startPoint.psi) * tprime * this.turnRadius;
      point.psi = this.startPoint.psi;
    }
    ;
    point.psi = modulo(point.psi, 2 * Math.PI);
    return point;
  }
  toObject() {
    return {
      type: this.type,
      startPoint: this.startPoint,
      turnRadius: this.turnRadius,
      tprimeMax: this.tprimeMax,
      length: this.length,
      center: this.center,
      arcAngles: this.arcAngles
    };
  }
};
export {
  Dubins,
  SEGMENT_TYPES,
  Segment
};
