/* =========================================================
   STCA NODE NETWORK — reusable 3D animated hero background
   Drop a <canvas class="hero-3d-canvas" data-stca-network></canvas>
   inside any position:relative section and this will animate it.
========================================================= */
(function () {
  function initNetwork(canvas) {
    if (typeof THREE === "undefined") return;

    const section = canvas.parentElement;
    const prefersReducedMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)"
    ).matches;
    if (prefersReducedMotion) return;

    // Skip entirely on very small / low-power screens that can't afford it,
    // or where WebGL isn't actually supported (some in-app webviews).
    const isSmallScreen = window.innerWidth < 480;
    const supportsWebGL = (function () {
      try {
        const test = document.createElement("canvas");
        return !!(
          window.WebGLRenderingContext &&
          (test.getContext("webgl") || test.getContext("experimental-webgl"))
        );
      } catch (e) {
        return false;
      }
    })();
    if (!supportsWebGL) return;

    let width = section.clientWidth || window.innerWidth;
    let height = section.clientHeight || 400;
    if (height === 0) height = 400;

    let scene, camera, renderer;
    try {
      scene = new THREE.Scene();
      camera = new THREE.PerspectiveCamera(60, width / height, 0.1, 1000);
      camera.position.z = 60;

      renderer = new THREE.WebGLRenderer({
        canvas,
        alpha: true,
        antialias: !isSmallScreen,
      });
    } catch (e) {
      // WebGL context creation failed (low-end device, blocked GPU, etc.)
      // Fail silently — the gradient background still looks fine without it.
      return;
    }

    const isMobile = window.innerWidth < 768;
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, isMobile ? 1.5 : 2));
    renderer.setSize(width, height);

    const baseDensity = parseInt(canvas.dataset.density || "60", 10);
    const density = isSmallScreen
      ? Math.round(baseDensity * 0.4)
      : isMobile
      ? Math.round(baseDensity * 0.65)
      : baseDensity;
    const nodes = [];
    const nodeGeo = new THREE.SphereGeometry(0.55, 10, 10);
    const cyanMat = new THREE.MeshBasicMaterial({ color: 0x29e3d6 });
    const amberMat = new THREE.MeshBasicMaterial({ color: 0xffb703 });

    const group = new THREE.Group();
    scene.add(group);

    for (let i = 0; i < density; i++) {
      const mat = Math.random() > 0.84 ? amberMat : cyanMat;
      const mesh = new THREE.Mesh(nodeGeo, mat);
      const spread = 55;
      mesh.position.set(
        (Math.random() - 0.5) * spread * 1.8,
        (Math.random() - 0.5) * spread,
        (Math.random() - 0.5) * 40 - 10
      );
      mesh.userData.velocity = new THREE.Vector3(
        (Math.random() - 0.5) * 0.04,
        (Math.random() - 0.5) * 0.04,
        (Math.random() - 0.5) * 0.02
      );
      group.add(mesh);
      nodes.push(mesh);
    }

    const lineMaterial = new THREE.LineBasicMaterial({
      color: 0x4a5aa8,
      transparent: true,
      opacity: 0.35,
    });
    const lineSegments = new THREE.LineSegments(
      new THREE.BufferGeometry(),
      lineMaterial
    );
    group.add(lineSegments);

    const MAX_DIST = 18;

    function rebuildLines() {
      const positions = [];
      for (let i = 0; i < nodes.length; i++) {
        for (let j = i + 1; j < nodes.length; j++) {
          const d = nodes[i].position.distanceTo(nodes[j].position);
          if (d < MAX_DIST) {
            positions.push(
              nodes[i].position.x,
              nodes[i].position.y,
              nodes[i].position.z,
              nodes[j].position.x,
              nodes[j].position.y,
              nodes[j].position.z
            );
          }
        }
      }
      lineSegments.geometry.dispose();
      lineSegments.geometry = new THREE.BufferGeometry();
      lineSegments.geometry.setAttribute(
        "position",
        new THREE.Float32BufferAttribute(positions, 3)
      );
    }

    rebuildLines();

    const bounds = { x: 50, y: 30, z: 30 };
    let frame = 0;
    let mouseX = 0;
    let mouseY = 0;
    let isPaused = document.hidden;

    section.addEventListener("mousemove", (e) => {
      const rect = section.getBoundingClientRect();
      mouseX = ((e.clientX - rect.left) / rect.width - 0.5) * 2;
      mouseY = ((e.clientY - rect.top) / rect.height - 0.5) * 2;
    });

    // Touch devices: gentle parallax follows the first touch point too
    section.addEventListener(
      "touchmove",
      (e) => {
        if (!e.touches || !e.touches[0]) return;
        const rect = section.getBoundingClientRect();
        const touch = e.touches[0];
        mouseX = ((touch.clientX - rect.left) / rect.width - 0.5) * 2;
        mouseY = ((touch.clientY - rect.top) / rect.height - 0.5) * 2;
      },
      { passive: true }
    );

    // Pause rendering when the tab/app isn't visible — saves battery on mobile
    document.addEventListener("visibilitychange", () => {
      isPaused = document.hidden;
    });

    function animate() {
      requestAnimationFrame(animate);
      if (isPaused) return;
      frame++;

      nodes.forEach((n) => {
        n.position.add(n.userData.velocity);
        if (Math.abs(n.position.x) > bounds.x) n.userData.velocity.x *= -1;
        if (Math.abs(n.position.y) > bounds.y) n.userData.velocity.y *= -1;
        if (Math.abs(n.position.z) > bounds.z) n.userData.velocity.z *= -1;
      });

      if (frame % 4 === 0) rebuildLines();

      group.rotation.y += 0.0009;
      camera.position.x += (mouseX * 8 - camera.position.x) * 0.03;
      camera.position.y += (-mouseY * 6 - camera.position.y) * 0.03;
      camera.lookAt(0, 0, 0);

      renderer.render(scene, camera);
    }
    animate();

    let resizeTimer;
    window.addEventListener("resize", () => {
      clearTimeout(resizeTimer);
      // Debounced — mobile browsers fire resize repeatedly during
      // address-bar show/hide and orientation changes.
      resizeTimer = setTimeout(() => {
        width = section.clientWidth || window.innerWidth;
        height = section.clientHeight || 400;
        if (height === 0) height = 400;
        camera.aspect = width / height;
        camera.updateProjectionMatrix();
        renderer.setSize(width, height);
      }, 150);
    });
  }

  document.addEventListener("DOMContentLoaded", () => {
    document
      .querySelectorAll("canvas[data-stca-network]")
      .forEach(initNetwork);
  });
})();
