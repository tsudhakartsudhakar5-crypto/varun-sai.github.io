// Varun Sai — The Time Changes
// Version 3 website interactions

document.addEventListener("DOMContentLoaded", () => {
  // =====================================
// THREE.JS CINEMATIC HOURGLASS
// VARUN SAI — THE TIME DIMENSION
// =====================================

async function initializeHero3D() {

    const canvas = document.getElementById("hero-3d");

    if (!canvas) return;

    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
        return;
    }

    try {

        const THREE = await import(
            "https://cdn.jsdelivr.net/npm/three@0.170.0/build/three.module.js"
        );

        const scene = new THREE.Scene();

        const camera = new THREE.PerspectiveCamera(
            40,
            1,
            0.1,
            100
        );

        camera.position.z = 5.5;

        const renderer = new THREE.WebGLRenderer({
            canvas: canvas,
            alpha: true,
            antialias: true,
            powerPreference: "low-power"
        });

        renderer.setPixelRatio(
            Math.min(window.devicePixelRatio, 1.5)
        );

        renderer.outputColorSpace = THREE.SRGBColorSpace;

        // Lighting

        scene.add(
            new THREE.AmbientLight(0xffffff, 1.2)
        );

        const goldLight = new THREE.PointLight(
            0xdcb66b,
            65,
            12
        );

        goldLight.position.set(2, 2, 3);

        scene.add(goldLight);

        const secondLight = new THREE.PointLight(
            0xffffff,
            35,
            10
        );

        secondLight.position.set(-3, -1, 2);

        scene.add(secondLight);

        // Main hourglass group

        const hourglass = new THREE.Group();

        scene.add(hourglass);

        // Glass body

        const glassPoints = [
            [0.62, -1.55],
            [0.67, -1.35],
            [0.52, -0.90],
            [0.28, -0.40],
            [0.14, -0.08],
            [0.14, 0.08],
            [0.28, 0.40],
            [0.52, 0.90],
            [0.67, 1.35],
            [0.62, 1.55]
        ].map(p => new THREE.Vector2(p[0], p[1]));

        const glassGeometry = new THREE.LatheGeometry(
            glassPoints,
            96
        );

        const glassMaterial = new THREE.MeshPhysicalMaterial({
            color: 0xe8d6ad,
            metalness: 0.05,
            roughness: 0.08,
            transparent: true,
            opacity: 0.22,
            side: THREE.DoubleSide,
            depthWrite: false
        });

        const glass = new THREE.Mesh(
            glassGeometry,
            glassMaterial
        );

        hourglass.add(glass);

        // Golden rings

        const ringMaterial = new THREE.MeshStandardMaterial({
            color: 0xd6ae65,
            metalness: 0.85,
            roughness: 0.22
        });

        function addRing(y, radius) {

            const ring = new THREE.Mesh(
                new THREE.TorusGeometry(radius, 0.035, 16, 96),
                ringMaterial
            );

            ring.rotation.x = Math.PI / 2;
            ring.position.y = y;

            hourglass.add(ring);
        }

        addRing(1.55, 0.64);
        addRing(-1.55, 0.64);

        // Golden sand

        const sandMaterial = new THREE.MeshStandardMaterial({
            color: 0xd6a64f,
            metalness: 0.7,
            roughness: 0.3
        });

        const upperSand = new THREE.Mesh(
            new THREE.ConeGeometry(0.39, 0.55, 48),
            sandMaterial
        );

        upperSand.position.y = 1.05;
        hourglass.add(upperSand);

        const lowerSand = new THREE.Mesh(
            new THREE.ConeGeometry(0.48, 0.38, 48),
            sandMaterial
        );

        lowerSand.position.y = -1.32;
        hourglass.add(lowerSand);

        // Falling sand stream

        const stream = new THREE.Mesh(
            new THREE.CylinderGeometry(
                0.009,
                0.009,
                0.95,
                12
            ),
            sandMaterial
        );

        stream.position.y = -0.48;

        hourglass.add(stream);

        // Floating golden particles

        const particleCount = 130;

        const particleGeometry = new THREE.BufferGeometry();

        const positions = new Float32Array(
            particleCount * 3
        );

        for (let i = 0; i < particleCount; i++) {

            positions[i * 3] = (Math.random() - 0.5) * 3;
            positions[i * 3 + 1] = (Math.random() - 0.5) * 4;
            positions[i * 3 + 2] = (Math.random() - 0.5) * 2;

        }

        particleGeometry.setAttribute(
            "position",
            new THREE.BufferAttribute(positions, 3)
        );

        const particleMaterial = new THREE.PointsMaterial({
            color: 0xe5bd72,
            size: 0.025,
            transparent: true,
            opacity: 0.8,
            sizeAttenuation: true
        });

        const particles = new THREE.Points(
            particleGeometry,
            particleMaterial
        );

        scene.add(particles);

        // Responsive rendering

        function resize() {

            const width = canvas.clientWidth;
            const height = canvas.clientHeight;

            if (!width || !height) return;

            camera.aspect = width / height;
            camera.updateProjectionMatrix();

            renderer.setSize(width, height, false);
        }

        resize();

        const resizeObserver = new ResizeObserver(resize);

        resizeObserver.observe(canvas);

        // Subtle mouse movement

        let targetX = 0;
        let targetY = 0;

        canvas.parentElement.addEventListener(
            "pointermove",
            event => {

                const rect = canvas.getBoundingClientRect();

                targetY = (
                    (event.clientX - rect.left) / rect.width - 0.5
                ) * 0.35;

                targetX = (
                    (event.clientY - rect.top) / rect.height - 0.5
                ) * 0.25;

            }
        );

        // Pause when outside viewport

        let visible = false;

        const observer = new IntersectionObserver(entries => {

            visible = entries[0].isIntersecting;

            if (visible) {
                renderer.render(scene, camera);
            }

        });

        observer.observe(canvas);

        // Animation loop

        let animationId;

        function animate() {

            animationId = requestAnimationFrame(animate);

            if (!visible) return;

            hourglass.rotation.y += 0.003;

            hourglass.rotation.x +=
                (targetX - hourglass.rotation.x) * 0.025;

            hourglass.rotation.y +=
                (targetY - (hourglass.rotation.y % (Math.PI * 2))) * 0.002;

            particles.rotation.y += 0.0007;
            particles.rotation.x += 0.0002;

            renderer.render(scene, camera);

        }

        animate();

        // Cleanup if the page is hidden

        document.addEventListener("visibilitychange", () => {

            if (document.hidden) {
                cancelAnimationFrame(animationId);
            } else {
                animate();
            }

        });

    } catch (error) {

        console.error(
            "3D experience could not initialize:",
            error
        );

        canvas.style.display = "none";

    }

}

initializeHero3D();

  // Mobile navigation
  const menuButton = document.querySelector(".menu");
  const navigation = document.querySelector(".header nav");

  if (menuButton && navigation) {
    menuButton.addEventListener("click", () => {
      navigation.classList.toggle("open");

      const isOpen = navigation.classList.contains("open");
      menuButton.setAttribute("aria-expanded", isOpen);
    });

    // Close mobile menu after selecting a link
    navigation.querySelectorAll("a").forEach(link => {
      link.addEventListener("click", () => {
        navigation.classList.remove("open");
        menuButton.setAttribute("aria-expanded", "false");
      });
    });
  }

  // Automatic copyright year
 const yearElement = document.querySelector(".year"); 

  if (yearElement) {
    yearElement.textContent = new Date().getFullYear();
  }

  // Smooth reveal for major sections
  const sections = document.querySelectorAll(
    ".section, .question, .buy, .contact"
  );

  if ("IntersectionObserver" in window) {
    const observer = new IntersectionObserver(
      entries => {
        entries.forEach(entry => {
          if (entry.isIntersecting) {
            entry.target.classList.add("visible");
            observer.unobserve(entry.target);
          }
        });
      },
      {
        threshold: 0.12
      }
    );

    sections.forEach(section => {
      section.classList.add("reveal");
      observer.observe(section);
    });
  }

});
