(function () {
  "use strict";

  var prefersReducedMotion = window.matchMedia(
    "(prefers-reduced-motion: reduce)",
  ).matches;
  var themeChangeTimeout;
  document.documentElement.classList.add("js-enabled");

  function initNavigation() {
    var header = document.querySelector(".site-header");
    var menuToggle = document.querySelector(".site-menu-toggle");
    var navigation = document.querySelector(".site-nav");
    var sections = Array.from(
      document.querySelectorAll("#home, #about, #projects"),
    );
    var sectionLinks = Array.from(
      document.querySelectorAll('.site-nav__link[href^="#"]'),
    );
    var activeFrame;

    if (!header || !menuToggle || !navigation) return;

    function setMenuOpen(isOpen) {
      header.classList.toggle("is-menu-open", isOpen);
      menuToggle.setAttribute("aria-expanded", String(isOpen));
      menuToggle.setAttribute(
        "aria-label",
        isOpen ? "Close navigation" : "Open navigation",
      );
    }

    menuToggle.addEventListener("click", function () {
      setMenuOpen(menuToggle.getAttribute("aria-expanded") !== "true");
    });

    navigation.addEventListener("click", function (event) {
      if (!event.target.closest("a")) return;
      setMenuOpen(false);
      if (window.innerWidth <= 720) menuToggle.focus({ preventScroll: true });
    });

    document.addEventListener("keydown", function (event) {
      if (
        event.key !== "Escape" ||
        menuToggle.getAttribute("aria-expanded") !== "true"
      )
        return;
      setMenuOpen(false);
      menuToggle.focus();
    });

    window.addEventListener("resize", function () {
      if (window.innerWidth > 720) setMenuOpen(false);
    });

    function updateActiveSection() {
      var focusPoint = window.innerHeight * 0.45;
      var activeSection = sections.find(function (section) {
        var bounds = section.getBoundingClientRect();
        return bounds.top <= focusPoint && bounds.bottom > focusPoint;
      });

      if (!activeSection) return;

      sectionLinks.forEach(function (link) {
        var isActive = link.getAttribute("href") === "#" + activeSection.id;
        link.classList.toggle("is-active", isActive);
        if (isActive) {
          link.setAttribute("aria-current", "location");
        } else {
          link.removeAttribute("aria-current");
        }
      });
    }

    function scheduleActiveUpdate() {
      if (activeFrame) return;
      activeFrame = window.requestAnimationFrame(function () {
        activeFrame = undefined;
        updateActiveSection();
      });
    }

    if ("IntersectionObserver" in window) {
      var sectionObserver = new IntersectionObserver(scheduleActiveUpdate, {
        rootMargin: "-25% 0px -55% 0px",
        threshold: 0,
      });
      sections.forEach(function (section) {
        sectionObserver.observe(section);
      });
    }

    window.addEventListener("scroll", scheduleActiveUpdate, { passive: true });
    window.addEventListener("resize", scheduleActiveUpdate);
    updateActiveSection();
  }

  function initSmoothScroll() {
    document.querySelectorAll('a[href^="#"]').forEach(function (link) {
      link.addEventListener("click", function (event) {
        var targetId = link.getAttribute("href");
        if (!targetId || targetId === "#") return;

        var targetElement = document.querySelector(targetId);
        if (!targetElement) return;

        event.preventDefault();
        targetElement.scrollIntoView({
          behavior: prefersReducedMotion ? "auto" : "smooth",
          block: "start",
        });
      });
    });
  }

  function getStoredTheme() {
    try {
      return localStorage.getItem("portfolio-theme");
    } catch (error) {
      return null;
    }
  }

  function storeTheme(theme) {
    try {
      localStorage.setItem("portfolio-theme", theme);
    } catch (error) {
      return;
    }
  }

  function setTheme(theme, toggle) {
    var isDark = theme === "dark";
    var sunIcon = toggle.querySelector(".site-theme-toggle__sun");
    var moonIcon = toggle.querySelector(".site-theme-toggle__moon");
    var label = isDark ? "Enable light mode" : "Enable dark mode";

    document.documentElement.classList.toggle("is-dark", isDark);
    document.body.classList.toggle("is-dark", isDark);
    toggle.setAttribute("aria-pressed", String(isDark));
    toggle.setAttribute("aria-label", label);
    toggle.setAttribute("title", label);
    sunIcon.hidden = !isDark;
    moonIcon.hidden = isDark;
  }

  function initThemeToggle() {
    var toggle = document.querySelector(".site-theme-toggle");
    if (!toggle) return;

    var savedTheme = getStoredTheme();
    setTheme(savedTheme === "dark" ? "dark" : "light", toggle);

    toggle.addEventListener("click", function () {
      var nextTheme = document.body.classList.contains("is-dark")
        ? "light"
        : "dark";
      setTheme(nextTheme, toggle);
      storeTheme(nextTheme);

      if (prefersReducedMotion) return;

      window.clearTimeout(themeChangeTimeout);
      document.body.classList.add("is-theme-changing");
      themeChangeTimeout = window.setTimeout(function () {
        document.body.classList.remove("is-theme-changing");
      }, 450);
    });
  }

  function initTabs() {
    var tabs = Array.from(document.querySelectorAll('.about-tab[role="tab"]'));
    var panels = Array.from(
      document.querySelectorAll('.about-tab-panel[role="tabpanel"]'),
    );
    var transitionTimeout;
    var activeTab = tabs.find(function (tab) {
      return tab.getAttribute("aria-selected") === "true";
    });
    var activePanel;

    if (!tabs.length || !panels.length || !activeTab) return;

    activePanel = panels.find(function (panel) {
      return panel.id === activeTab.getAttribute("aria-controls");
    });

    if (!activePanel) return;

    function updateTabState(tab) {
      tabs.forEach(function (tabButton) {
        var isSelected = tabButton === tab;
        tabButton.classList.toggle("is-active", isSelected);
        tabButton.setAttribute("aria-selected", String(isSelected));
        tabButton.tabIndex = isSelected ? 0 : -1;
      });
    }

    function resetPanel(panel, hidden) {
      panel.classList.remove(
        "is-entering",
        "is-leaving",
        "is-transitioning",
        "is-active",
      );
      panel.style.removeProperty("--tab-enter-offset");
      panel.style.removeProperty("--tab-exit-offset");
      panel.hidden = hidden;
    }

    function activateTab(tab) {
      var nextPanel = panels.find(function (panel) {
        return panel.id === tab.getAttribute("aria-controls");
      });
      var previousTabIndex;
      var nextTabIndex;
      var direction;

      if (!nextPanel || tab === activeTab) return;

      window.clearTimeout(transitionTimeout);
      previousTabIndex = tabs.indexOf(activeTab);
      nextTabIndex = tabs.indexOf(tab);
      direction = nextTabIndex > previousTabIndex ? 1 : -1;

      panels.forEach(function (panel) {
        if (panel !== activePanel && panel !== nextPanel) {
          resetPanel(panel, true);
        }
      });

      updateTabState(tab);

      if (prefersReducedMotion) {
        resetPanel(activePanel, true);
        resetPanel(nextPanel, false);
        nextPanel.classList.add("is-active");
        activeTab = tab;
        activePanel = nextPanel;
        return;
      }

      nextPanel.hidden = false;
      nextPanel.classList.remove("is-leaving", "is-transitioning", "is-active");
      nextPanel.classList.add("is-entering");
      nextPanel.style.setProperty("--tab-enter-offset", direction * 10 + "%");
      nextPanel.style.setProperty("--tab-exit-offset", direction * -10 + "%");

      activePanel.classList.remove("is-entering", "is-transitioning");
      activePanel.classList.add("is-leaving");
      activePanel.style.setProperty("--tab-enter-offset", direction * 10 + "%");
      activePanel.style.setProperty("--tab-exit-offset", direction * -10 + "%");

      activeTab = tab;
      activePanel = nextPanel;

      window.requestAnimationFrame(function () {
        if (activePanel !== nextPanel) return;
        nextPanel.classList.add("is-transitioning");
        panels.forEach(function (panel) {
          if (panel.classList.contains("is-leaving")) {
            panel.classList.add("is-transitioning");
          }
        });
      });

      transitionTimeout = window.setTimeout(function () {
        panels.forEach(function (panel) {
          if (panel !== nextPanel && panel.classList.contains("is-leaving")) {
            resetPanel(panel, true);
          }
        });
        nextPanel.classList.remove("is-entering", "is-transitioning");
        nextPanel.classList.add("is-active");
        nextPanel.style.removeProperty("--tab-enter-offset");
        nextPanel.style.removeProperty("--tab-exit-offset");
      }, 420);
    }

    updateTabState(activeTab);
    panels.forEach(function (panel) {
      resetPanel(panel, panel !== activePanel);
    });
    activePanel.classList.add("is-active");

    tabs.forEach(function (tab) {
      tab.addEventListener("click", function () {
        activateTab(tab);
      });

      tab.addEventListener("keydown", function (event) {
        var currentIndex = tabs.indexOf(tab);
        var nextIndex;

        if (event.key === "Home") {
          event.preventDefault();
          tabs[0].focus();
          activateTab(tabs[0]);
          return;
        }

        if (event.key === "End") {
          event.preventDefault();
          tabs[tabs.length - 1].focus();
          activateTab(tabs[tabs.length - 1]);
          return;
        }

        if (event.key !== "ArrowRight" && event.key !== "ArrowLeft") return;

        event.preventDefault();
        var direction = event.key === "ArrowRight" ? 1 : -1;
        nextIndex = (currentIndex + direction + tabs.length) % tabs.length;
        tabs[nextIndex].focus();
        activateTab(tabs[nextIndex]);
      });
    });
  }

  function initProfileTilt() {
    var profile = document.querySelector(".about-profile");
    var animationFrame;
    var pointerX;
    var pointerY;

    if (
      !profile ||
      prefersReducedMotion ||
      !window.matchMedia("(hover: hover) and (pointer: fine)").matches
    )
      return;

    function updateTilt() {
      var bounds = profile.getBoundingClientRect();
      var horizontalPosition = (pointerX - bounds.left) / bounds.width - 0.5;
      var verticalPosition = (pointerY - bounds.top) / bounds.height - 0.5;

      profile.style.setProperty(
        "--profile-rotate-x",
        (-verticalPosition * 2.8).toFixed(2) + "deg",
      );
      profile.style.setProperty(
        "--profile-rotate-y",
        (horizontalPosition * 2.8).toFixed(2) + "deg",
      );
      animationFrame = undefined;
    }

    function resetTilt() {
      window.cancelAnimationFrame(animationFrame);
      animationFrame = undefined;
      profile.classList.remove("is-tilting");
      profile.style.removeProperty("--profile-rotate-x");
      profile.style.removeProperty("--profile-rotate-y");
    }

    profile.addEventListener("pointerenter", function (event) {
      if (event.pointerType && event.pointerType !== "mouse") return;
      profile.classList.add("is-tilting");
    });

    profile.addEventListener("pointermove", function (event) {
      if (event.pointerType && event.pointerType !== "mouse") return;
      pointerX = event.clientX;
      pointerY = event.clientY;

      if (!animationFrame) {
        animationFrame = window.requestAnimationFrame(updateTilt);
      }
    });

    profile.addEventListener("pointerleave", resetTilt);
  }

  function initTechStackCarousel() {
    var track = document.querySelector(".tech-stack__carousel");
    var windowElement = document.querySelector(".tech-stack__carousel-window");
    var cards = Array.from(document.querySelectorAll(".tech-stack__card"));
    var reducedMotionMedia = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    );
    var resizeFrame;
    var animationFrame;
    var lastTimestamp;
    var progress = 0;
    var radiusX = 0;
    var radiusY = 0;
    var isInView = false;
    var hoveredCards = new Set();
    var touchPausedCard = null;
    var textMeasureContext = document.createElement("canvas").getContext("2d");

    if (!track || !windowElement || !cards.length) return;

    function measureCarousel() {
      var firstCardStyle = window.getComputedStyle(cards[0]);
      var cardWidth = parseFloat(firstCardStyle.width);
      var cardHeight = parseFloat(firstCardStyle.height);
      cards.forEach(function (card) {
        var label = card.querySelector(".tech-stack__card-name");
        label.style.removeProperty("font-size");

        if (window.innerWidth > 720) {
          var labelStyle = window.getComputedStyle(label);
          var words = label.innerHTML
            .split(/<wbr\s*\/?>/i)
            .flatMap(function (part) {
              return part.trim().split(/\s+/);
            });
          var widestWord = Math.max.apply(
            null,
            words.map(function (word) {
              textMeasureContext.font = labelStyle.font;
              return textMeasureContext.measureText(word).width;
            }),
          );
          var availableWidth =
            label.clientWidth -
            parseFloat(labelStyle.paddingLeft) -
            parseFloat(labelStyle.paddingRight) -
            1;
          var baseFontSize = parseFloat(labelStyle.fontSize);
          var fittedFontSize = Math.max(
            8,
            Math.min(baseFontSize, baseFontSize * (availableWidth / widestWord)),
          );

          label.style.fontSize = fittedFontSize.toFixed(2) + "px";
        }
      });
      radiusX =
        Math.max(0, (windowElement.clientWidth - cardWidth) / 2) *
        parseFloat(
          window.getComputedStyle(windowElement).getPropertyValue("--arc-radius-x"),
        );
      radiusY = Math.max(
        0,
        (windowElement.clientHeight - cardHeight) / 2 - 8,
      );
      positionCards(progress);
    }

    function positionCards(currentProgress) {
      if (window.innerWidth <= 720) return;

      // Distribute cards along the upper half of a wide ellipse.
      cards.forEach(function (card, index) {
        var position = (index / cards.length + currentProgress) % 1;
        var angle = position * Math.PI;
        var depth = Math.sin(angle);
        var edgeFade = Math.min(1, Math.min(position, 1 - position) / 0.08);
        var opacity = reducedMotionMedia.matches
          ? 1
          : edgeFade * edgeFade * (3 - 2 * edgeFade);

        card.style.setProperty(
          "--carousel-x",
          (-Math.cos(angle) * radiusX).toFixed(1) + "px",
        );
        card.style.setProperty(
          "--carousel-y",
          (radiusY * (1 - 2 * depth)).toFixed(1) + "px",
        );
        card.style.setProperty(
          "--carousel-layer",
          String(Math.round(depth * 20) + 1),
        );
        card.style.setProperty(
          "--carousel-scale",
          (0.94 + depth * 0.06).toFixed(3),
        );
        card.style.setProperty(
          "--carousel-opacity",
          opacity.toFixed(3),
        );
      });
    }

    function requestPositionUpdate() {
      if (resizeFrame) return;
      resizeFrame = window.requestAnimationFrame(function () {
        resizeFrame = undefined;
        measureCarousel();
        updateAnimationState();
      });
    }

    function canAnimate() {
      return (
        !reducedMotionMedia.matches &&
        window.innerWidth > 720 &&
        isInView &&
        hoveredCards.size === 0 &&
        !touchPausedCard &&
        document.visibilityState === "visible"
      );
    }

    function animateCarousel(timestamp) {
      animationFrame = undefined;
      if (!canAnimate()) {
        lastTimestamp = undefined;
        return;
      }

      if (lastTimestamp === undefined) lastTimestamp = timestamp;
      var elapsed = Math.min(timestamp - lastTimestamp, 64);
      lastTimestamp = timestamp;
      progress = (progress + elapsed / 78000) % 1;
      positionCards(progress);
      animationFrame = window.requestAnimationFrame(animateCarousel);
    }

    function updateAnimationState() {
      if (!canAnimate()) {
        window.cancelAnimationFrame(animationFrame);
        animationFrame = undefined;
        lastTimestamp = undefined;
        return;
      }

      if (!animationFrame) {
        animationFrame = window.requestAnimationFrame(animateCarousel);
      }
    }

    measureCarousel();
    window.addEventListener("resize", requestPositionUpdate);

    if ("ResizeObserver" in window) {
      var resizeObserver = new ResizeObserver(requestPositionUpdate);
      resizeObserver.observe(windowElement);
      resizeObserver.observe(cards[0]);
    }

    // Pause only while a card itself is hovered or explicitly tapped.
    cards.forEach(function (card) {
      card.addEventListener("pointerenter", function (event) {
        if (event.pointerType === "touch") return;
        hoveredCards.add(card);
        updateAnimationState();
      });
      card.addEventListener("pointerleave", function () {
        hoveredCards.delete(card);
        updateAnimationState();
      });
      card.addEventListener("pointerdown", function (event) {
        if (event.pointerType !== "touch") return;
        touchPausedCard = card;
        updateAnimationState();
      });
    });

    document.addEventListener("pointerdown", function (event) {
      if (!touchPausedCard || touchPausedCard.contains(event.target)) return;
      touchPausedCard = null;
      updateAnimationState();
    });
    document.addEventListener("visibilitychange", updateAnimationState);
    if (reducedMotionMedia.addEventListener) {
      reducedMotionMedia.addEventListener("change", function () {
        positionCards(progress);
        updateAnimationState();
      });
    }

    if ("IntersectionObserver" in window) {
      var visibilityObserver = new IntersectionObserver(function (entries) {
        isInView = entries.some(function (entry) {
          return entry.isIntersecting;
        });
        updateAnimationState();
      });
      visibilityObserver.observe(windowElement);
    } else {
      isInView = true;
      updateAnimationState();
    }
  }

  function initScrollProgress() {
    var progress = document.createElement("div");
    var progressBar = document.createElement("span");
    var isTicking = false;

    progress.className = "scroll-progress";
    progress.setAttribute("aria-hidden", "true");
    progress.appendChild(progressBar);
    document.body.appendChild(progress);

    function updateProgress() {
      var scrollableHeight =
        document.documentElement.scrollHeight - window.innerHeight;
      var progressValue =
        scrollableHeight > 0
          ? Math.min(window.scrollY / scrollableHeight, 1)
          : 0;
      progressBar.style.transform = "scaleX(" + progressValue + ")";
      isTicking = false;
    }

    function requestProgressUpdate() {
      if (isTicking) return;
      isTicking = true;
      window.requestAnimationFrame(updateProgress);
    }

    updateProgress();
    window.addEventListener("scroll", requestProgressUpdate, { passive: true });
    window.addEventListener("resize", requestProgressUpdate);
  }

  function initScrollReveal() {
    var selectors = [
      ".about-section__header",
      ".about-profile",
      ".about-tabs",
      ".about-tab-panels",
      ".projects-intro",
      ".projects-heading",
      ".project--featured",
      ".project-item",
    ];
    var revealElements = Array.from(
      document.querySelectorAll(selectors.join(",")),
    );

    revealElements.forEach(function (element, index) {
      element.classList.add("js-reveal");
      element.style.setProperty("--reveal-delay", (index % 4) * 70 + "ms");
    });

    if (prefersReducedMotion || !("IntersectionObserver" in window)) {
      revealElements.forEach(function (element) {
        element.classList.add("is-visible");
      });
      return;
    }

    var observer = new IntersectionObserver(
      function (entries) {
        entries.forEach(function (entry) {
          if (!entry.isIntersecting) return;
          entry.target.classList.add("is-visible");
          observer.unobserve(entry.target);
        });
      },
      {
        threshold: 0.14,
        rootMargin: "0px 0px -40px",
      },
    );

    revealElements.forEach(function (element) {
      observer.observe(element);
    });
  }

  document.addEventListener("DOMContentLoaded", function () {
    initNavigation();
    initSmoothScroll();
    initThemeToggle();
    initTabs();
    initProfileTilt();
    initTechStackCarousel();
    initScrollProgress();
    initScrollReveal();
  });
})();
