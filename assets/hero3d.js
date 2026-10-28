/* Phone Island: the hero phone in 3D (three.js r149, loaded on demand).
   An iPhone (13 Pro proportions: 71.5 x 146.7 x 7.65 mm) in graphite steel, lit like a studio product shot. It first
   shows its back, shattered: the cracks are the real ones of a broken iPhone 11 (Unsplash MuvOSjacXJI), laid on the
   back glass. The cracks close back into the point of impact, the phone turns slowly to face the visitor, its screen
   wakes on the Phone Island lock screen and the notification comes down. Then it breathes; it can be turned with the
   finger or the mouse; "Revoir la réparation" plays it again.
   Units: 1 = 1 mm. Front of the phone towards +z. */
(function () {
  'use strict';
  var T = window.THREE;
  if (T.ColorManagement) T.ColorManagement.legacyMode = false;   // colours given in sRGB, lit in linear light
  var W = 71.5, H = 146.7, D = 7.65, R = 11.4;           // body
  var RIM = 0.8;                                           // steel seen around the glass, front and back
  var GW = W - 2 * RIM, GH = H - 2 * RIM, GR = R - RIM;    // glass
  var PI = Math.PI;

  function rr(w, h, r) {
    var s = new T.Shape(), x = -w / 2, y = -h / 2;
    s.moveTo(x + r, y);
    s.lineTo(x + w - r, y); s.absarc(x + w - r, y + r, r, -PI / 2, 0, false);
    s.lineTo(x + w, y + h - r); s.absarc(x + w - r, y + h - r, r, 0, PI / 2, false);
    s.lineTo(x + r, y + h); s.absarc(x + r, y + h - r, r, PI / 2, PI, false);
    s.lineTo(x, y + r); s.absarc(x + r, y + r, r, PI, 1.5 * PI, false);
    return s;
  }
  function rrPath(w, h, r) {
    var p = new T.Path(), x = -w / 2, y = -h / 2;
    p.moveTo(x + r, y);
    p.lineTo(x + w - r, y); p.absarc(x + w - r, y + r, r, -PI / 2, 0, false);
    p.lineTo(x + w, y + h - r); p.absarc(x + w - r, y + h - r, r, 0, PI / 2, false);
    p.lineTo(x + r, y + h); p.absarc(x + r, y + h - r, r, PI / 2, PI, false);
    p.lineTo(x, y + r); p.absarc(x + r, y + r, r, PI, 1.5 * PI, false);
    return p;
  }
  function fitUV(geo, w, h) {
    var p = geo.attributes.position, uv = geo.attributes.uv;
    for (var i = 0; i < p.count; i++) uv.setXY(i, p.getX(i) / w + .5, p.getY(i) / h + .5);
    uv.needsUpdate = true;
    return geo;
  }
  function ease(t) { t = Math.min(1, Math.max(0, t)); return t < .5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2; }
  function easeOut(t) { t = Math.min(1, Math.max(0, t)); return 1 - Math.pow(1 - t, 3); }
  function lerp(a, b, t) { return a + (b - a) * t; }
  function seg(t, a, b) { return Math.min(1, Math.max(0, (t - a) / (b - a))); }
  function loadImg(src) {
    return new Promise(function (res) {
      var im = new Image(); im.decoding = 'async';
      im.onload = function () { res(im); }; im.onerror = function () { res(null); };
      im.src = src;
    });
  }
  function rrect(ctx, x, y, w, h, r) {
    ctx.beginPath(); ctx.moveTo(x + r, y); ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath();
  }

  // ------------------------------------------------------------------ the screen, drawn on canvases
  var CW = 1000, CH = Math.round(CW * GH / GW), PX = CW / GW;   // px per mm on the display texture
  var SCR = 2.2 * PX, SR = 8.37 * PX;                           // the active area inside the glass, its corners
  var NW = 27.7 * PX, ND = 6.2 * PX, NR = 3.3 * PX;              // the notch
  function notchPath(ctx) {
    var x0 = CW / 2 - NW / 2, x1 = CW / 2 + NW / 2, y0 = SCR - 2, y1 = SCR + ND, f = .9 * PX;
    ctx.beginPath();
    ctx.moveTo(x0 - f, y0); ctx.quadraticCurveTo(x0, y0, x0, y0 + f);
    ctx.lineTo(x0, y1 - NR); ctx.quadraticCurveTo(x0, y1, x0 + NR, y1);
    ctx.lineTo(x1 - NR, y1); ctx.quadraticCurveTo(x1, y1, x1, y1 - NR);
    ctx.lineTo(x1, y0 + f); ctx.quadraticCurveTo(x1, y0, x1 + f, y0);
    ctx.closePath();
  }
  function frontCam(ctx, lit) {
    var x = CW / 2 - 9.84 * PX, y = SCR + 2.3 * PX, r = 1.25 * PX;
    var g = ctx.createRadialGradient(x - r * .3, y - r * .3, r * .1, x, y, r);
    g.addColorStop(0, lit ? '#2a3550' : '#161b26'); g.addColorStop(.55, '#0b0d13'); g.addColorStop(1, '#050507');
    ctx.fillStyle = g; ctx.beginPath(); ctx.arc(x, y, r, 0, 2 * PI); ctx.fill();
    ctx.fillStyle = 'rgba(160,190,255,.35)'; ctx.beginPath(); ctx.arc(x - r * .35, y - r * .3, r * .18, 0, 2 * PI); ctx.fill();
  }
  function drawOff(c) {
    var ctx = c.getContext('2d');
    ctx.fillStyle = '#050506'; ctx.fillRect(0, 0, CW, CH);
    // the grille of the earpiece, in the border above the screen
    ctx.fillStyle = '#0c0d10'; rrect(ctx, CW / 2 - 5.6 * PX, SCR - 1.55 * PX, 11.2 * PX, .55 * PX, .27 * PX); ctx.fill();
    frontCam(ctx, false);
  }
  function statusIcons(ctx, x, y, s) {
    ctx.save(); ctx.translate(x, y); ctx.scale(s, s);
    ctx.fillStyle = ctx.strokeStyle = 'rgba(243,235,221,.92)';
    [[1, 9.5, 2], [5, 7.5, 4], [9, 5.5, 6], [13, 3.5, 8]].forEach(function (b) { ctx.fillRect(b[0], b[1], 2, b[2]); });
    ctx.lineWidth = 1.3; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.arc(20, 9.6, 6.4, -2.4, -.74); ctx.stroke();
    ctx.beginPath(); ctx.arc(20, 9.6, 3.6, -2.4, -.74); ctx.stroke();
    ctx.beginPath(); ctx.arc(20, 8.8, .95, 0, 2 * PI); ctx.fill();
    ctx.lineWidth = 1; rrect(ctx, 26.5, 3.6, 6.4, 6.4, 1.5); ctx.stroke();
    ctx.restore();
  }
  function padlock(ctx, x, y, s, open) {
    ctx.save(); ctx.translate(x, y); ctx.scale(s, s);
    ctx.fillStyle = ctx.strokeStyle = 'rgba(243,235,221,.9)';
    rrect(ctx, 1.5, 8.5, 13, 10, 2.4); ctx.fill();
    ctx.lineWidth = 1.7; ctx.beginPath();
    if (open) { ctx.moveTo(4.6, 4.4); ctx.lineTo(4.6, 3.2); ctx.arc(8, 3.2, 3.4, PI, 0); ctx.lineTo(11.4, 8.5); }   // v23: open, its shackle up
    else { ctx.moveTo(4.6, 8.5); ctx.lineTo(4.6, 6); ctx.arc(8, 6, 3.4, PI, 0); ctx.lineTo(11.4, 8.5); }
    ctx.stroke();
    ctx.restore();
  }
  function drawLock(c, logo, font, open) {
    var ctx = c.getContext('2d');
    ctx.clearRect(0, 0, CW, CH);
    var sx = SCR, sy = SCR, sw = CW - 2 * SCR, sh = CH - 2 * SCR;
    ctx.save(); rrect(ctx, sx, sy, sw, sh, SR); ctx.clip();
    ctx.fillStyle = '#000'; ctx.fillRect(sx, sy, sw, sh);
    var em = CW / 100 * (GW / W);                                    // 1% of the phone's width, on this canvas
    if (logo) {
      var lw = sw * .58, lh = lw * logo.naturalHeight / logo.naturalWidth;
      ctx.drawImage(logo, CW / 2 - lw / 2, sy + sh * .92 - lh, lw, lh);
    }
    var d = new Date();
    var time = (d.getHours() < 10 ? '0' : '') + d.getHours() + ':' + (d.getMinutes() < 10 ? '0' : '') + d.getMinutes();
    var date = d.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' });
    ctx.textAlign = 'center'; ctx.textBaseline = 'top';
    ctx.fillStyle = 'rgba(243,235,221,.82)'; ctx.font = '500 ' + Math.round(4.6 * em) + 'px ' + font;
    ctx.fillText(date, CW / 2, sy + sh * .116);
    ctx.fillStyle = '#f3ebdd'; ctx.font = '600 ' + Math.round(21 * em) + 'px ' + font;
    if ('letterSpacing' in ctx) ctx.letterSpacing = Math.round(-.035 * 21 * em) + 'px';
    ctx.fillText(time, CW / 2, sy + sh * .146);
    if ('letterSpacing' in ctx) ctx.letterSpacing = '0px';
    padlock(ctx, CW / 2 - 1.65 * em, sy + sh * .074, 3.3 * em / 16, open);
    statusIcons(ctx, sx + sw - sw * .066 - 14.5 * em, sy + sh * .0205, 14.5 * em / 34);
    ctx.fillStyle = 'rgba(243,235,221,.9)'; rrect(ctx, CW / 2 - sw * .18, sy + sh * (1 - .011) - 1.15 * em, sw * .36, 1.15 * em, .57 * em); ctx.fill();
    ctx.restore();
    return time;
  }
  function drawRim(c) {                 // v23: the black border, the notch and the camera, over the screen
    var ctx = c.getContext('2d');
    ctx.clearRect(0, 0, CW, CH);
    ctx.fillStyle = '#000'; ctx.fillRect(0, 0, CW, CH);
    ctx.globalCompositeOperation = 'destination-out';
    rrect(ctx, SCR, SCR, CW - 2 * SCR, CH - 2 * SCR, SR); ctx.fill();
    ctx.globalCompositeOperation = 'source-over';
    ctx.fillStyle = '#000'; notchPath(ctx); ctx.fill();
    ctx.fillStyle = '#0c0d10'; rrect(ctx, CW / 2 - 5.6 * PX, SCR - 1.55 * PX, 11.2 * PX, .55 * PX, .27 * PX); ctx.fill();
    frontCam(ctx, true);
  }
  function drawNotif(c, icon, font) {
    var ctx = c.getContext('2d'), w = c.width, h = c.height, s = w / 100;
    ctx.clearRect(0, 0, w, h);
    ctx.fillStyle = 'rgba(52,49,45,.96)'; rrect(ctx, 0, 0, w, h, 7.6 * s); ctx.fill();
    var ix = 4.2 * s, iy = (h - 12.4 * s) / 2, is = 12.4 * s;
    ctx.fillStyle = '#000'; rrect(ctx, ix, iy, is, is, 3.3 * s); ctx.fill();
    ctx.strokeStyle = 'rgba(243,235,221,.16)'; ctx.lineWidth = .25 * s; ctx.stroke();
    if (icon) { var iw = is * .74, ih = iw * icon.naturalHeight / icon.naturalWidth; ctx.drawImage(icon, ix + (is - iw) / 2, iy + (is - ih) / 2, iw, ih); }
    ctx.textAlign = 'left'; ctx.textBaseline = 'top'; ctx.fillStyle = '#f3ebdd';
    var tx = ix + is + 3.8 * s;
    ctx.font = '600 ' + (4.8 * s) + 'px ' + font; ctx.fillText('Phone Island', tx, h * .2);
    ctx.font = '400 ' + (4.3 * s) + 'px ' + font; ctx.globalAlpha = .92;
    ctx.fillText('Réparation terminée. Votre', tx, h * .2 + 6.6 * s);
    ctx.fillText('téléphone est comme neuf.', tx, h * .2 + 12.0 * s);
    ctx.globalAlpha = 1;
  }

  // ------------------------------------------------------------------ the studio the phone reflects
  function studio(renderer) {
    var env = new T.Scene();
    env.background = new T.Color(0x070605);
    function panel(w, h, color, k, pos) {
      var m = new T.Mesh(new T.PlaneGeometry(w, h), new T.MeshBasicMaterial({ color: new T.Color(color).multiplyScalar(k), side: T.DoubleSide }));
      m.position.set(pos[0], pos[1], pos[2]); m.lookAt(0, 0, 0); env.add(m);
    }
    panel(7.0, 4.2, 0xfff6ea, 5.0, [-3.2, 3.0, 3.6]);    // the key softbox, upper left in front
    panel(6.0, 6.0, 0xfff8f0, .55, [4.2, 0, 4.0]);        // a dim fill in front on the right
    panel(1.2, 9.0, 0xffffff, 6.0, [4.4, .5, -2.2]);      // a tall strip behind on the right: the rim on the steel
    panel(1.0, 8.0, 0xfff4e8, 3.0, [-4.6, 0, -2.0]);      // a weaker strip behind on the left
    panel(6.0, 1.2, 0xffffff, 2.5, [0, 4.8, .5]);         // overhead: the top edge
    panel(.7, .7, 0xffffff, 14.0, [-2.2, 2.6, 4.4]);      // a small bright light: the glints in the lenses
    panel(11.0, 1.7, 0xfffaf4, 3.2, [0, 1.25, 5.4]);      // a long light behind the viewer, a little above: the sheen on the glass
    panel(7.0, 1.0, 0xffeedd, .5, [0, -4.0, 2.0]);        // a low bounce
    var pm = new T.PMREMGenerator(renderer);
    var tex = pm.fromScene(env, .035).texture;
    pm.dispose();
    return tex;
  }

  // ------------------------------------------------------------------ the phone
  function build(tex) {
    var g = new T.Group();
    var steel = new T.MeshPhysicalMaterial({ color: 0x55575c, metalness: 1, roughness: .2, envMapIntensity: 1.25 });
    var steelDark = new T.MeshPhysicalMaterial({ color: 0x3b3d41, metalness: 1, roughness: .28 });
    var band = new T.MeshStandardMaterial({ color: 0x1d1e21, metalness: .2, roughness: .6 });

    // the frame: a steel ring, the glass sits in its hole front and back
    var B = .38;
    var outer = rr(W - 2 * B, H - 2 * B, R - B);
    outer.holes.push(rrPath(GW + 2 * B, GH + 2 * B, GR + B));
    var fg = new T.ExtrudeGeometry(outer, { depth: D - 2 * B, bevelEnabled: true, bevelThickness: B, bevelSize: B, bevelSegments: 5, curveSegments: 48 });
    fg.translate(0, 0, -(D - 2 * B) / 2);
    g.add(new T.Mesh(fg, steel));
    // an inner wall so the hole never shows through at grazing angles
    var core = new T.Mesh(new T.ExtrudeGeometry(rr(GW + .2, GH + .2, GR + .1), { depth: D - 1.2, bevelEnabled: false, curveSegments: 32 }),
      new T.MeshBasicMaterial({ color: 0x050505 }));
    core.position.z = -(D - 1.2) / 2; g.add(core);

    // antenna bands across the steel
    function bandAt(x, y, w, h, d) { var m = new T.Mesh(new T.BoxGeometry(w, h, d), band); m.position.set(x, y, 0); g.add(m); }
    [[H / 2 - 13.5], [-H / 2 + 15]].forEach(function (y) { bandAt(W / 2 - .05, y[0], .3, .9, D - 1.6); bandAt(-W / 2 + .05, y[0], .3, .9, D - 1.6); });
    bandAt(W / 2 - 15, H / 2 - .05, .9, .3, D - 1.6); bandAt(-W / 2 + 18, -H / 2 + .05, .9, .3, D - 1.6);

    // buttons: silent switch and volume on the left, the side button on the right
    function btn(x, y, len, deep) {
      var m = new T.Mesh(new T.CapsuleGeometry(1.15, len - 2.3, 6, 16), steel);
      m.scale.set(deep, 1, 1.25); m.position.set(x, y, 0); g.add(m);
    }
    btn(-W / 2 - .05, H / 2 - 27, 5.2, .55);
    btn(-W / 2 - .05, H / 2 - 40, 10.5, .55);
    btn(-W / 2 - .05, H / 2 - 54, 10.5, .55);
    btn(W / 2 + .05, H / 2 - 44, 17.5, .55);

    // the front: what the screen shows (off, then the lock screen), under a coat that only adds reflections
    var face = fitUV(new T.ShapeGeometry(rr(GW, GH, GR), 32), GW, GH);
    var off = new T.Mesh(face, new T.MeshBasicMaterial({ map: tex.off, toneMapped: false }));
    off.position.z = D / 2 - .03; g.add(off);
    var lockMat = new T.MeshBasicMaterial({ map: tex.lock, toneMapped: false, transparent: true, opacity: 0, depthWrite: false });
    var lock = new T.Mesh(face, lockMat); lock.position.z = D / 2 - .02; lock.renderOrder = 2.3; g.add(lock);
    // v23: the video under the lock screen (which slides up off it), and over both the screen's frame
    var vidMat = new T.MeshBasicMaterial({ map: tex.video, toneMapped: false, transparent: true, opacity: 0, depthWrite: false });
    var vidM = new T.Mesh(face, vidMat); vidM.position.z = D / 2 - .021; vidM.renderOrder = 2.2; g.add(vidM);
    var rimMat = new T.MeshBasicMaterial({ map: tex.rim, toneMapped: false, transparent: true, opacity: 0, depthWrite: false });
    var rimM = new T.Mesh(face, rimMat); rimM.position.z = D / 2 - .018; rimM.renderOrder = 2.4; g.add(rimM);
    var notifMat = new T.MeshBasicMaterial({ map: tex.notif, toneMapped: false, transparent: true, opacity: 0, depthWrite: false });
    var nw = (GW - 2 * 2.2) * .9, nh = nw * tex.notif.image.height / tex.notif.image.width;
    var notif = new T.Mesh(new T.PlaneGeometry(nw, nh), notifMat);
    var notifY = GH / 2 - 2.2 - (GH - 4.4) * .36 - nh / 2;
    notif.position.set(0, notifY, D / 2 - .015); notif.renderOrder = 3; g.add(notif);
    var coat = new T.Mesh(face, new T.MeshPhysicalMaterial({ color: 0x000000, metalness: 0, roughness: .1, clearcoat: 1, clearcoatRoughness: .1,
      transparent: true, blending: T.AdditiveBlending, depthWrite: false, envMapIntensity: .9 }));
    coat.position.z = D / 2 - .005; coat.renderOrder = 4; g.add(coat);

    // the back: frosted glass, shattered at first (the cracks close back to the point of impact as uR goes to 0)
    var U = { uR: { value: 1.35 } };
    var backMat = new T.MeshPhysicalMaterial({ color: 0x3a3c40, metalness: 0, roughness: .4, clearcoat: .5, clearcoatRoughness: .3, envMapIntensity: 1.0 });
    backMat.defines = { USE_UV: '' };
    backMat.onBeforeCompile = function (sh) {
      sh.uniforms.uBefore = { value: tex.before }; sh.uniforms.uCrack = { value: tex.crack }; sh.uniforms.uR = U.uR;
      sh.uniforms.uC = { value: new T.Vector2(.51, .50) }; sh.uniforms.uA = { value: GH / GW };
      sh.fragmentShader = 'uniform sampler2D uBefore;\nuniform sampler2D uCrack;\nuniform float uR;\nuniform vec2 uC;\nuniform float uA;\nfloat ck;\n' + sh.fragmentShader
        .replace('#include <map_fragment>', [
          '#include <map_fragment>',
          'vec2 qq = vUv - uC; qq.y *= uA;',
          'float nn = texture2D(uCrack, vUv * 2.3 + vec2(.31, .17)).r;',
          'float dd = length(qq) * (.88 + .3 * nn);',
          'float keep = 1. - smoothstep(uR - .09, uR, dd);',
          'vec3 bef = pow(texture2D(uBefore, vUv).rgb, vec3(2.2));',
          'ck = texture2D(uCrack, vUv).r * keep;',
          'vec3 shard = min(diffuseColor.rgb * bef / vec3(.028), vec3(.8)) + vec3(.22) * ck;',
          'diffuseColor.rgb = mix(diffuseColor.rgb, shard, keep);'
        ].join('\n'))
        .replace('#include <roughnessmap_fragment>', '#include <roughnessmap_fragment>\nroughnessFactor = mix(roughnessFactor, .82, ck);')
        .replace('#include <emissivemap_fragment>', '#include <emissivemap_fragment>\ntotalEmissiveRadiance += vec3(.80, .82, .86) * ck * .05;');
    };
    var back = fitUV(new T.ShapeGeometry(rr(GW, GH, GR), 32), GW, GH);
    back.rotateY(PI);
    var backMesh = new T.Mesh(back, backMat); backMesh.position.z = -D / 2 + .03; g.add(backMesh);

    // the camera plateau and its lenses, placed as measured on Makenson's restored 13 Pro (mm from the top left corner,
    // seen from the back; that corner is +x, +y here): plateau 37 x 38.3 mm, 3.5 mm from the side, 3.2 mm from the top
    function backAt(x, y) { return [W / 2 - x, H / 2 - y]; }
    var PW = 37, PH = 38.3, PR = 7.5, PB = .35, PZ = .95;
    var pc = backAt(3.5 + PW / 2, 3.2 + PH / 2);
    var plat = new T.ExtrudeGeometry(rr(PW - 2 * PB, PH - 2 * PB, PR - PB), { depth: PZ - 2 * PB, bevelEnabled: true, bevelThickness: PB, bevelSize: PB, bevelSegments: 4, curveSegments: 48 });
    plat.translate(0, 0, PB); plat.rotateY(PI);
    var plateau = new T.Mesh(plat, new T.MeshPhysicalMaterial({ color: 0x24252a, metalness: 0, roughness: .12, clearcoat: .8, clearcoatRoughness: .06, envMapIntensity: .6 }));
    plateau.position.set(pc[0], pc[1], -D / 2 + .02); g.add(plateau);
    var top = -D / 2 - PZ;                                              // the plateau's outer face
    function canvasTex(w, h, draw) {
      var c = document.createElement('canvas'); c.width = w; c.height = h; draw(c.getContext('2d'));
      var t = new T.CanvasTexture(c); t.encoding = T.sRGBEncoding; t.anisotropy = 4; return t;
    }
    function cring(c, x, y, r, w, col) { c.beginPath(); c.arc(x, y, r, 0, 2 * PI); c.lineWidth = w; c.strokeStyle = col; c.stroke(); }
    function cdisc(c, x, y, r, col) { c.beginPath(); c.arc(x, y, r, 0, 2 * PI); c.fillStyle = col; c.fill(); }
    // a lens seen through its cover glass: the rings of the barrel going down to a dark pupil
    var lensTex = canvasTex(256, 256, function (c) {
      cdisc(c, 128, 128, 128, '#07080a');
      var gr = c.createRadialGradient(128, 128, 10, 128, 128, 128);
      gr.addColorStop(0, '#04040a'); gr.addColorStop(.55, '#0b0d14'); gr.addColorStop(.8, '#121520'); gr.addColorStop(1, '#1b1e26');
      cdisc(c, 128, 128, 126, gr);
      cring(c, 128, 128, 121, 3, '#3b3e46'); cring(c, 128, 128, 104, 10, '#06070a'); cring(c, 128, 128, 92, 2, '#2a2e3a');
      cring(c, 128, 128, 76, 12, '#090a0e'); cring(c, 128, 128, 62, 2, '#252a3a');
      var p = c.createRadialGradient(118, 116, 2, 128, 128, 50);
      p.addColorStop(0, '#1a1635'); p.addColorStop(.6, '#07060f'); p.addColorStop(1, '#020203');
      cdisc(c, 128, 128, 50, p); cring(c, 128, 128, 36, 1.5, '#1f2236');
    });
    var flashTex = canvasTex(128, 128, function (c) {
      cdisc(c, 64, 64, 64, '#2a2a2c'); cdisc(c, 64, 64, 58, '#d8d2c2');
      for (var r = 54; r > 6; r -= 6) cring(c, 64, 64, r, 2, r % 12 ? '#c8bfa9' : '#e9e4d6');
      cdisc(c, 64, 64, 8, '#efe9da');
    });
    var lidarTex = canvasTex(128, 128, function (c) {
      cdisc(c, 64, 64, 64, '#121216'); cdisc(c, 64, 64, 56, '#060608');
      var p = c.createRadialGradient(64, 64, 2, 64, 64, 40); p.addColorStop(0, '#2a1d3a'); p.addColorStop(1, '#060608');
      cdisc(c, 64, 64, 40, p); cring(c, 64, 64, 46, 2, '#1d1d24');
    });
    var ringMat = new T.MeshPhysicalMaterial({ color: 0x5a5c61, metalness: 1, roughness: .14, envMapIntensity: 1.6 });
    var lensMat = new T.MeshPhysicalMaterial({ map: lensTex, metalness: .1, roughness: .03, clearcoat: 1, clearcoatRoughness: .01, iridescence: .45, iridescenceIOR: 1.6, iridescenceThicknessRange: [300, 420], envMapIntensity: .6 });
    var dark = new T.MeshBasicMaterial({ color: 0x030303 });
    // a steel ring 15 mm across standing 2.4 mm proud, the lens 1.9 mm down inside it
    var prof = [[7.45, 0], [7.45, 1.75], [7.38, 2.1], [7.18, 2.32], [6.9, 2.42], [6.45, 2.42], [6.2, 2.3], [6.05, 2.05], [6.0, 1.9]].map(function (v) { return new T.Vector2(v[0], v[1]); });
    var ringGeo = new T.LatheGeometry(prof, 72); ringGeo.rotateX(-PI / 2);
    var lensGeo = new T.CircleGeometry(6.02, 72); lensGeo.rotateY(PI);
    [[13, 12, 1], [13, 30, 1], [29.5, 21.5, 1.04]].forEach(function (l) {
      var p = backAt(l[0], l[1]), k = l[2];
      var ring = new T.Mesh(ringGeo, ringMat); ring.scale.set(k, k, 1); ring.position.set(p[0], p[1], top); g.add(ring);
      var lens = new T.Mesh(lensGeo, lensMat); lens.scale.set(k, k, 1); lens.position.set(p[0], p[1], top - 1.9); g.add(lens);
      var cav = new T.Mesh(new T.CylinderGeometry(6 * k, 6 * k, 1.9, 48, 1, true), dark);
      cav.rotation.x = PI / 2; cav.position.set(p[0], p[1], top - .95); g.add(cav);
    });
    function addDisc(x, y, r, mat, lift) {
      var p = backAt(x, y), geo = new T.CircleGeometry(r, 48); geo.rotateY(PI);
      var m = new T.Mesh(geo, mat); m.position.set(p[0], p[1], top - (lift || .02)); g.add(m);
    }
    addDisc(29.7, 8.6, 2.9, new T.MeshPhysicalMaterial({ map: flashTex, roughness: .3, clearcoat: 1, clearcoatRoughness: .05 }));
    addDisc(29.7, 34.6, 3.0, new T.MeshPhysicalMaterial({ map: lidarTex, roughness: .08, clearcoat: 1, clearcoatRoughness: .02 }));
    addDisc(36.6, 31.6, .5, dark);
    return { group: g, U: U, lock: lockMat, notif: notif, notifMat: notifMat, notifY: notifY, vid: vidMat, rim: rimMat };
  }

  // ------------------------------------------------------------------ the show
  window.PIHero3D = function (opts) {
    var host = opts.host, base = opts.base || 'assets/', reduce = !!opts.reduce;
    var renderer;
    try {
      renderer = new T.WebGLRenderer({ antialias: true, alpha: true, powerPreference: 'high-performance' });
    } catch (e) { return null; }
    if (!renderer.getContext()) return null;
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.outputEncoding = T.sRGBEncoding;
    renderer.toneMapping = T.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.06;
    renderer.setClearColor(0x000000, 0);
    var cvs = renderer.domElement;
    cvs.setAttribute('aria-hidden', 'true');
    host.appendChild(cvs);

    var scene = new T.Scene();
    scene.environment = studio(renderer);
    var key = new T.DirectionalLight(0xfff0de, 1.1); key.position.set(-160, 220, 260); scene.add(key);
    var rim = new T.DirectionalLight(0xdfe8ff, .7); rim.position.set(260, 60, -220); scene.add(rim);
    var camera = new T.PerspectiveCamera(24, 1, 40, 3000);
    var DIST = 438;

    var font = opts.font || 'Poppins, sans-serif';
    var cOff = document.createElement('canvas'), cLock = document.createElement('canvas'), cNotif = document.createElement('canvas');
    cOff.width = cLock.width = CW; cOff.height = cLock.height = CH; cNotif.width = 900; cNotif.height = 230;
    drawOff(cOff);
    function ctex(c) { var t = new T.CanvasTexture(c); t.encoding = T.sRGBEncoding; t.anisotropy = 4; return t; }
    var tex = { off: ctex(cOff), lock: ctex(cLock), notif: ctex(cNotif) };
    // v23: the video of the screen, muted, played once to its end after the phone unlocks (then the show starts again).
    // It is fetched while the repair plays, and paused when it is out of sight.
    var video = document.createElement('video');
    video.muted = true; video.defaultMuted = true; video.loop = false; video.playsInline = true; video.preload = 'none';
    video.setAttribute('muted', ''); video.setAttribute('playsinline', ''); video.setAttribute('aria-hidden', 'true');
    video.style.cssText = 'position:absolute;left:0;top:0;width:2px;height:2px;opacity:0;pointer-events:none';
    host.appendChild(video);
    tex.video = new T.VideoTexture(video); tex.video.encoding = T.sRGBEncoding;
    var cRim = document.createElement('canvas'); cRim.width = CW; cRim.height = CH; drawRim(cRim);
    tex.rim = ctex(cRim);
    var vidState = { asked: false, on: false, primed: false, failed: false };
    function videoPrep() {                // the file starts coming as the repair plays, so it is there when the phone unlocks
      if (vidState.asked) return;
      vidState.asked = true; video.preload = 'auto';
      // H.264 for every browser that has it (Safari, Chrome, Edge); VP9 for the others
      video.src = base + (video.canPlayType('video/mp4; codecs="avc1.4D401F"') ? 'hero-video.mp4' : 'hero-video.webm');
    }
    function videoOn(on) {
      if (on) { if (vidState.failed) return; videoPrep(); }
      if (on === vidState.on) return;
      vidState.on = on;
      if (on) {
        var pr = video.play();
        if (pr && pr.catch) pr.catch(function (e) { vidState.on = false; if (!e || e.name !== 'AbortError') { vidState.failed = true; kick(); } });
      } else video.pause();
    }
    function videoPrime() {               // its first picture ready before the unlock (an iPhone only fetches a video asked to play)
      if (vidState.primed || vidState.failed) return;
      vidState.primed = true; videoPrep();
      if (video.readyState >= 2) return;
      var pr = video.play();
      if (pr && pr.then) pr.then(function () { if (!vidState.on) { video.pause(); try { video.currentTime = 0; } catch (e) {} } },
        function (e) { if (!vidState.on && (!e || e.name !== 'AbortError')) { vidState.failed = true; kick(); } });
    }
    function videoReset() {               // back to its first picture, for the next unlock
      vidState.primed = false;
      if (video.readyState && video.currentTime > 0) { try { video.currentTime = 0; } catch (e) {} }
    }
    video.addEventListener('ended', function () {     // the end of the video: the phone fades, and the show starts again
      vidState.on = false;
      if (S.phase === 'video') { S.phase = 'out'; S.t0 = performance.now(); S.last = 0; kick(); }
    });
    video.addEventListener('error', function () { vidState.failed = true; kick(); });
    var loader = new T.TextureLoader();
    var ready = Promise.all([
      new Promise(function (r) { tex.before = loader.load(base + 'hero3d-back.webp', r, undefined, r); }),
      new Promise(function (r) { tex.crack = loader.load(base + 'hero3d-crack.webp', r, undefined, r); }),
      loadImg(base + 'logo-720.webp'), loadImg(base + 'mark-96.webp'),
      (document.fonts && document.fonts.load) ? Promise.all([document.fonts.load('600 80px ' + font), document.fonts.load('500 40px ' + font), document.fonts.load('400 40px ' + font)]).catch(function () {}) : Promise.resolve()
    ]);
    var P = build(tex);
    var pivot = new T.Group(); pivot.add(P.group); scene.add(pivot);
    var logoImg = null, iconImg = null, shown = '';

    // poses: the back shown three-quarters, then the front, slightly turned
    var BACK = { y: PI + .44, x: .13 }, FRONT = { y: 2 * PI - .2, x: .05 };
    var S = { t0: 0, phase: 'wait', done: reduce, visible: true, raf: 0, last: 0, paused: 0, hold: 0, fadeIn: false, open: false };
    var drag = { on: false, x: 0, v: 0, off: 0, lastMove: 0 };
    var look = { x: 0, y: 0, tx: 0, ty: 0 };

    function size() {
      var w = host.clientWidth, h = host.clientHeight;
      if (!w || !h) return;
      renderer.setSize(w, h, false);
      camera.aspect = w / h;
      // keep the whole phone in view whatever the shape of the box
      var fitH = 2 * DIST * Math.tan(T.MathUtils.degToRad(12));
      var need = Math.max(H / .82, (W * 1.3) / camera.aspect);
      camera.position.set(0, 0, DIST * need / fitH);
      camera.updateProjectionMatrix();
    }

    function pose(t) {
      // t in seconds from the start of the show
      var ry, rx, py = 0, k = 1;
      if (t < 1.2) { var e = easeOut(seg(t, 0, 1.2)); ry = lerp(BACK.y + .2, BACK.y, e); rx = BACK.x; py = lerp(-9, 0, e); }
      else if (t < 4.6) { ry = lerp(BACK.y, BACK.y - .2, seg(t, 1.2, 4.6)); rx = BACK.x; }
      else { var e2 = ease(seg(t, 4.6, 7.6)); ry = lerp(BACK.y - .2, FRONT.y, e2); rx = lerp(BACK.x, FRONT.x, e2); py = Math.sin(e2 * PI) * 3; }
      P.U.uR.value = lerp(1.35, 0, ease(seg(t, 2.6, 4.5)));
      screen(t);
      return { ry: ry, rx: rx, py: py, k: k };
    }
    function idle(tt) {
      if (reduce) return { ry: FRONT.y, rx: FRONT.x, py: 0, k: 1 };
      return { ry: FRONT.y + Math.sin(tt * .55) * .075, rx: FRONT.x + Math.sin(tt * .41 + 1) * .03, py: Math.sin(tt * .7) * .9, k: 1 };
    }
    function redrawLock(force) {
      var d = new Date(), key = d.getHours() + ':' + d.getMinutes();
      if (!force && key === shown) return;
      shown = key; drawLock(cLock, logoImg, font, S.open); tex.lock.needsUpdate = true;
    }
    // v23: the screen at the moment t of the show
    var UNLOCK = 12.4;                    // when the lock screen starts to slide up (s)
    function zoom(z) { var r = 1 / z; tex.video.repeat.set(r, r); tex.video.offset.set((1 - r) / 2, (1 - r) / 2); }
    function screen(t) {
      var on = easeOut(seg(t, 7.9, 8.9));                        // it wakes on the lock screen
      var n = easeOut(seg(t, 9.2, 10.0));                        // the notification comes down
      var u = seg(t, UNLOCK, UNLOCK + .8), d = ease(u) * 1.06;   // the lock screen slides up, out of the screen
      var open = t >= UNLOCK - .45;                              // the padlock opens just before
      if (open !== S.open) { S.open = open; redrawLock(true); }
      tex.lock.offset.y = -d;
      P.lock.opacity = u >= 1 ? 0 : on;
      var nu = easeOut(seg(u, 0, .4));                           // the notification goes up with it, and fades
      P.notifMat.opacity = n * (1 - nu);
      P.notif.position.y = P.notifY + (1 - n) * 4.5 + d * GH; P.notif.scale.setScalar(.96 + .04 * n);
      P.rim.opacity = on;                                        // the border, the notch and the camera, over the rest
      P.vid.opacity = t >= UNLOCK - .2 ? 1 : 0;                  // under the lock screen until it slides away
      zoom(1 + .07 * (1 - easeOut(seg(t, UNLOCK + .1, UNLOCK + 1.2))));   // it comes forward a little, as on an iPhone
      if (t >= UNLOCK) videoOn(true);
      else { videoOn(false); if (t >= 7) videoPrime(); }
    }
    function screenVideo() {              // the video, whole
      P.lock.opacity = 0; P.notifMat.opacity = 0; P.rim.opacity = 1; P.vid.opacity = 1; tex.lock.offset.y = 0; zoom(1);
    }
    function still(now) {                 // the video cannot play here: the phone stays on its lock screen (a tap tries again)
      S.phase = 'still'; S.t0 = now; S.done = true; videoOn(false);
      if (S.open) { S.open = false; redrawLock(true); }
      tex.lock.offset.y = 0; zoom(1);
    }
    function frame(now) {
      S.raf = 0;
      if (!S.visible) return;
      var dt = S.last ? Math.min(250, now - S.last) : 0, t;
      S.last = now;
      if (S.phase === 'show') {
        t = (now - S.t0) / 1000;
        // the video has to be able to play before the phone unlocks: until then the lock screen waits (10 s at most)
        if (t > UNLOCK - .5 && t < UNLOCK && !vidState.failed && video.readyState < 2) {
          S.t0 += dt; S.hold += dt; t = (now - S.t0) / 1000;
          if (S.hold > 10000) vidState.failed = true;
        }
        if (vidState.failed && t > UNLOCK - .5) still(now);
        else if (t >= UNLOCK + 1.2) S.phase = 'video';
      } else if (S.phase === 'video' && vidState.failed) still(now);
      else if (S.phase === 'out' && now - S.t0 >= 750) play(true);    // faded out: once more, from the start
      t = (now - S.t0) / 1000;
      var p, k = 1;
      if (S.phase === 'show') {
        p = pose(t);                                             // the repair, the turn, the screen
        var a = ease(seg(t, 7.6, 9.6)), q = idle(now / 1000);    // then it starts to breathe, from still
        p.ry += (q.ry - FRONT.y) * a; p.rx += (q.rx - FRONT.x) * a; p.py += q.py * a;
        if (S.fadeIn) k = easeOut(seg(t, 0, .9));
        S.done = t > 10.2;
      } else if (S.phase === 'wait') {
        p = pose(0);
      } else {
        p = idle(now / 1000);
        if (S.phase === 'video') { screenVideo(); videoOn(true); }
        else if (S.phase === 'out') { screenVideo(); k = 1 - easeOut(seg(t, 0, .7)); }
        else {                                                   // still: the lock screen and its notification
          P.lock.opacity = Math.min(1, P.lock.opacity + dt / 500); P.notifMat.opacity = Math.min(1, P.notifMat.opacity + dt / 500);
          P.notif.position.y = P.notifY; P.notif.scale.setScalar(1); P.rim.opacity = 1; P.vid.opacity = P.lock.opacity < 1 ? 1 : 0;
        }
      }
      // the finger or the mouse turns it; let go and it comes back
      if (!drag.on) { drag.off += drag.v; drag.v *= .92; if (now - drag.lastMove > 1400) drag.off *= .94; }
      look.x += (look.tx - look.x) * .06; look.y += (look.ty - look.y) * .06;
      pivot.rotation.set(p.rx + look.y * .1, p.ry + drag.off + look.x * .22, 0);
      pivot.position.y = p.py;
      cvs.style.opacity = k;
      if (P.lock.opacity > 0 && now % 1000 < 40) redrawLock(false);
      renderer.render(scene, camera);
      var moving = drag.on || Math.abs(drag.off) > .001 || Math.abs(look.tx - look.x) + Math.abs(look.ty - look.y) > .002;
      if ((!reduce && S.phase !== 'wait') || moving) S.raf = requestAnimationFrame(frame);
    }
    function kick() { if (!S.raf && S.visible) S.raf = requestAnimationFrame(frame); }

    function play(again) {                // the show from its start (again: after the video, the phone fades in)
      if (reduce) { still(performance.now()); P.lock.opacity = 1; P.notifMat.opacity = 1; kick(); return; }
      S.phase = 'show'; S.done = false; S.fadeIn = !!again; S.t0 = performance.now(); S.last = 0; S.hold = 0;
      drag.off = 0; drag.v = 0;
      vidState.on = false; video.pause(); videoReset();
      screen(0);
      kick();
    }
    function setVisible(v) {              // off screen, in a hidden tab or paused: everything waits where it was
      if (v === S.visible) return;
      if (!v) { S.paused = performance.now(); videoOn(false); }
      else if (S.paused && (S.phase === 'show' || S.phase === 'out')) S.t0 += performance.now() - S.paused;
      S.visible = v; S.last = 0;
      if (v) kick();
    }
    // when the browser would not play the video by itself, a tap on the phone lets it: the phone then unlocks
    cvs.addEventListener('click', function () {
      if (S.phase !== 'still' || reduce) return;
      vidState.failed = false; vidState.primed = true; videoPrep();
      var pr = video.play();
      if (pr && pr.then) pr.then(function () {
        video.pause(); try { video.currentTime = 0; } catch (e) {}
        if (S.phase !== 'still') return;
        S.phase = 'show'; S.fadeIn = false; S.hold = 0; S.last = 0; S.t0 = performance.now() - (UNLOCK - .7) * 1000; kick();
      }, function () { vidState.failed = true; });
    });

    // drag to turn (horizontal moves only, so the page still scrolls on a phone)
    cvs.style.touchAction = 'pan-y';
    cvs.addEventListener('pointerdown', function (e) {
      if (!S.done) return;
      drag.on = true; drag.x = e.clientX; drag.v = 0; drag.lastMove = performance.now();
      try { cvs.setPointerCapture(e.pointerId); } catch (er) {}
      kick();
    });
    cvs.addEventListener('pointermove', function (e) {
      if (drag.on) {
        var dx = e.clientX - drag.x; drag.x = e.clientX;
        var dv = dx * .011; drag.off += dv; drag.v = dv; drag.lastMove = performance.now(); kick();
      } else if (e.pointerType === 'mouse') {
        var r = cvs.getBoundingClientRect();
        look.tx = (e.clientX - r.left) / r.width - .5; look.ty = (e.clientY - r.top) / r.height - .5; kick();
      }
    });
    function up() { drag.on = false; kick(); }
    cvs.addEventListener('pointerup', up); cvs.addEventListener('pointercancel', up);
    cvs.addEventListener('pointerleave', function () { look.tx = look.ty = 0; });

    size();
    if ('ResizeObserver' in window) new ResizeObserver(function () { size(); kick(); }).observe(host);
    else window.addEventListener('resize', function () { size(); kick(); });
    document.addEventListener('visibilitychange', function () { setVisible(!document.hidden); });
    setInterval(function () { if (S.done) { redrawLock(false); kick(); } }, 20000);

    return ready.then(function (r) {
      logoImg = r[2]; iconImg = r[3];
      redrawLock(true);
      drawNotif(cNotif, iconImg, font); tex.notif.needsUpdate = true;
      tex.before.needsUpdate = true;
      if (reduce) { S.done = true; }
      kick();
      function seek(t) { S.phase = 'show'; S.fadeIn = false; S.hold = 0; S.last = 0; S.t0 = performance.now() - t * 1000; S.raf = 0; frame(performance.now()); cancelAnimationFrame(S.raf); S.raf = 0; }
      return { play: function () { play(false); }, replay: function () { play(false); }, setVisible: setVisible, canvas: cvs, seek: seek,
        state: function () { return { phase: S.phase, t: Math.round((performance.now() - S.t0) / 100) / 10, video: Math.round(video.currentTime * 10) / 10 }; } };
    });
  };
})();
