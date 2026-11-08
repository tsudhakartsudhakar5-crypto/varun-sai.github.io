// Varun Sai — The Time Changes
// Version 3 website interactions

document.addEventListener("DOMContentLoaded", () => {

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
  const yearElement = document.getElementById("year");

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
