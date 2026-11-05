(function () {
  "use strict";

  function warmImageCache(sources) {
    function preloadImages() {
      sources.forEach(function (source) {
        var image = new Image();
        image.decoding = "async";
        image.fetchPriority = "low";
        image.src = source;
      });
    }

    function schedulePreload() {
      if ("requestIdleCallback" in window) {
        window.requestIdleCallback(preloadImages, { timeout: 2500 });
      } else {
        window.setTimeout(preloadImages, 1200);
      }
    }

    if (document.readyState === "complete") {
      schedulePreload();
    } else {
      window.addEventListener("load", schedulePreload, { once: true });
    }
  }

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
      document.querySelectorAll("#home, #about, #projects, #contact"),
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

  function initDocumentViewer() {
    var viewer = document.querySelector(".document-viewer");
    var viewerImage = document.querySelector(".document-viewer__image");
    var closeButton = viewer && viewer.querySelector(".document-viewer__close");
    var navigationButtons = Array.from(
      viewer ? viewer.querySelectorAll(".document-viewer__nav-button") : [],
    );
    var galleries = {
      swalco: [
        {
          src: "assets/images/optimized/swalco/swal.jpg",
          alt: "Foto bersama tim Swalco di dalam kafe",
        },
        {
          src: "assets/images/optimized/swalco/swal1.jpg",
          alt: "Barista sedang menyiapkan kopi di Swalco",
        },
        {
          src: "assets/images/optimized/swalco/swal2.jpg",
          alt: "Dokumentasi profil Swal.co",
        },
        {
          src: "assets/images/optimized/swalco/swal3.jpg",
          alt: "Dokumentasi konten Reels Swal.co",
        },
      ],
    };
    var activeGallery = [];
    var activeIndex = 0;
    var lastTrigger;

    if (!viewer || !viewerImage || !closeButton) return;
    warmImageCache(
      galleries.swalco.map(function (image) {
        return image.src;
      }),
    );

    function renderImage() {
      var image = activeGallery[activeIndex];
      viewerImage.src = image.src;
      viewerImage.alt = image.alt;
    }

    document.addEventListener("click", function (event) {
      var trigger = event.target.closest(
        "[data-document-src], [data-document-gallery]",
      );
      if (!trigger) return;

      var title = trigger.getAttribute("data-document-title") || "Dokumen";
      var galleryId = trigger.getAttribute("data-document-gallery");
      var imageSource = trigger.getAttribute("data-document-src");
      activeGallery = galleryId
        ? galleries[galleryId]
        : imageSource
          ? [{ src: imageSource, alt: title }]
          : [];
      if (!activeGallery || !activeGallery.length) return;

      lastTrigger = trigger;
      activeIndex = 0;
      viewer.setAttribute("aria-label", title);
      navigationButtons.forEach(function (button) {
        button.hidden = activeGallery.length < 2;
      });
      renderImage();
      if (!viewer.open) viewer.showModal();
    });

    navigationButtons.forEach(function (button) {
      button.addEventListener("click", function () {
        var direction = Number(button.getAttribute("data-document-direction"));
        activeIndex =
          (activeIndex + direction + activeGallery.length) %
          activeGallery.length;
        renderImage();
      });
    });

    closeButton.addEventListener("click", function () {
      viewer.close();
    });

    viewer.addEventListener("click", function (event) {
      if (event.target === viewer) viewer.close();
    });

    viewer.addEventListener("keydown", function (event) {
      if (
        activeGallery.length < 2 ||
        (event.key !== "ArrowLeft" && event.key !== "ArrowRight")
      )
        return;
      event.preventDefault();
      var direction = event.key === "ArrowRight" ? 1 : -1;
      activeIndex =
        (activeIndex + direction + activeGallery.length) % activeGallery.length;
      renderImage();
    });

    viewer.addEventListener("close", function () {
      activeGallery = [];
      viewerImage.removeAttribute("src");
      if (lastTrigger) lastTrigger.focus({ preventScroll: true });
    });
  }

  function initProjectDetails() {
    var dialog = document.querySelector(".project-detail");
    var closeButton = document.querySelector(".project-detail__close");
    var title = document.querySelector("#project-detail-title");
    var eyebrow = document.querySelector(".project-detail__eyebrow");
    var category = document.querySelector(".project-detail__category");
    var description = document.querySelector("#project-detail-description");
    var tags = document.querySelector(".project-detail__tags");
    var actions = document.querySelector(".project-detail__actions");
    var media = document.querySelector(".project-detail__media");
    var visual = document.querySelector(".project-detail__visual");
    var placeholder =
      visual && visual.querySelector(".project-detail__placeholder");
    var navigationButtons = Array.from(
      document.querySelectorAll(".project-detail__nav-button"),
    );
    var lastTrigger;
    var technologyColors = {
      Python: "#3776ab",
      Streamlit: "#ff4b4b",
      Pandas: "#604080",
      "scikit-learn": "#f7931e",
      "K-Means": "#f7931e",
      BIRCH: "#2f855a",
      "Silhouette Score": "#0f766e",
      "Davies-Bouldin Index": "#0f766e",
      "Computation Time": "#64748b",
      PHP: "#777bb4",
      Laravel: "#ff2d20",
      MySQL: "#4479a1",
      Blade: "#f05340",
      Bootstrap: "#7952b3",
      JavaScript: "#c6a700",
      HTML: "#e34f26",
      CSS: "#1572b6",
      CSV: "#687386",
      OpenCV: "#5c3ee8",
      NumPy: "#4dabcf",
      "scikit-image": "#cb4b16",
      Flask: "#333333",
      Kotlin: "#7f52ff",
      "Jetpack Compose": "#4285f4",
      "Material 3": "#6750a4",
      Retrofit: "#2b9a57",
      "REST API": "#64748b",
      "Power BI": "#c49a00",
      "Power Query": "#742774",
      DAX: "#e6a700",
      KPI: "#0f766e",
      "Data Visualization": "#2563eb",
      "Interactive Filters": "#0891b2",
      "Edge Detection": "#5c3ee8",
      HOG: "#805ad5",
      "Contour Analysis": "#cb4b16",
      Heatmap: "#e53e3e",
      "Content-Based Recommendation": "#2563eb",
      "Audio Features": "#7c3aed",
      "Similarity Matching": "#0f766e",
      MVC: "#ff2d20",
      "Payment Integration": "#2b9a57",
      Figma: "#f24e1e",
      "UI/UX Design": "#805ad5",
      Prototyping: "#805ad5",
      "E-Commerce": "#059669",
      "Responsive UI": "#2563eb",
      "Product Catalog": "#db2777",
      "Shopping Cart": "#d97706",
    };
    var projects = {
      "bike-sales": {
        number: "01",
        title: "Bike Sales Clustering",
        category: "Data Analytics / Machine Learning",
        description:
          "Mengembangkan aplikasi analisis dan segmentasi data penjualan sepeda berbasis web menggunakan Python dan Streamlit dengan menerapkan serta membandingkan algoritma Machine Learning K-Means dan BIRCH. Proyek ini bertujuan mengelompokkan sepeda berdasarkan karakteristik harga ke dalam tiga segmen, yaitu Entry-Level, Mid-Range, dan High-End. Proses pengembangan mencakup data preprocessing, clustering, visualisasi hasil, serta evaluasi performa algoritma menggunakan Silhouette Score, Davies-Bouldin Index (DBI), dan waktu komputasi. Hasil segmentasi dapat dimanfaatkan untuk memahami karakteristik produk, mengidentifikasi segmen pasar, serta mendukung penyusunan strategi pemasaran dan pengambilan keputusan bisnis berbasis data.",
        technologies: [
          "Python",
          "Streamlit",
          "Pandas",
          "scikit-learn",
          "K-Means",
          "BIRCH",
          "Silhouette Score",
          "Davies-Bouldin Index",
          "Computation Time",
        ],
        image: "assets/images/optimized/project/KMEANSBIRCH.jpg",
        links: [
          {
            label: "GitHub",
            href: "https://github.com/corneliussatya02/comparison-K-Means-and-BIRCH.git",
          },
        ],
      },
      tanamin: {
        number: "02",
        title: "Tanam.in E-Commerce",
        category: "Web Development / E-Commerce",
        description:
          "Tanam.in merupakan proyek pengembangan website e-commerce yang berfokus pada penjualan tanaman hias dan kebutuhan pecinta tanaman. Website ini dirancang dengan antarmuka yang menarik, modern, dan responsif untuk memudahkan pengguna menjelajahi berbagai pilihan tanaman, melihat katalog produk, serta mengakses fitur pencarian, keranjang belanja, akun pengguna, dan pesanan saya. Proyek ini menjadi implementasi pengembangan sistem e-commerce yang mengutamakan kemudahan navigasi, pengalaman pengguna, serta penyajian informasi produk secara terstruktur.",
        technologies: [
          "PHP",
          "Laravel",
          "MySQL",
          "Blade",
          "Bootstrap",
          "JavaScript",
          "MVC",
          "Payment Integration",
        ],
        image: "assets/images/optimized/project/TANAMIN.jpg",
        links: [
          {
            label: "GitHub",
            href: "https://github.com/corneliussatya02/Tanamin-E-commerce.git",
          },
        ],
      },
      "sales-analytics": {
        number: "03",
        title: "Sales Analytics Dashboard",
        category: "Data Analytics / Dashboard",
        description:
          "Sales Analytics Dashboard merupakan proyek dashboard interaktif yang dikembangkan untuk menganalisis dan memvisualisasikan data penjualan secara informatif. Dashboard ini menampilkan berbagai metrik utama, seperti total revenue, jumlah transaksi, kuantitas produk terjual, dan rata-rata diskon, serta visualisasi tren penjualan bulanan dan perbandingan pendapatan berdasarkan wilayah. Dilengkapi dengan fitur filter berdasarkan region, kategori produk, tipe pelanggan, dan saluran penjualan, proyek ini membantu pengguna memahami pola penjualan serta mendukung pengambilan keputusan berbasis data.",
        technologies: [
          "HTML",
          "CSS",
          "JavaScript",
          "CSV",
          "KPI",
          "Data Visualization",
          "Interactive Filters",
        ],
        image: "assets/images/optimized/project/SALESANALYTICS.jpg",
        links: [
          {
            label: "GitHub",
            href: "https://github.com/corneliussatya02/Sales-Analytics-Dashboard.git",
          },
        ],
      },
      "road-damage": {
        number: "04",
        title: "Deteksi Jalan Rusak",
        category: "Image Processing / Machine Learning",
        description:
          "Deteksi Jalan Rusak merupakan proyek pengembangan aplikasi berbasis web untuk membantu proses identifikasi kondisi kerusakan jalan melalui analisis citra digital. Aplikasi ini menyediakan fitur unggah gambar jalan serta visualisasi hasil pemrosesan citra, meliputi grayscale, Edge Canny, mask, contours, heatmap mask, heatmap overlay, dan Histogram of Oriented Gradients (HOG). Dilengkapi dengan pengaturan parameter pemrosesan seperti Canny Threshold, Kernel Morphology, dan Minimal Area Kontur, proyek ini bertujuan untuk membantu pengguna mengamati karakteristik kerusakan permukaan jalan melalui pendekatan pengolahan citra digital.",
        technologies: [
          "Python",
          "Streamlit",
          "OpenCV",
          "NumPy",
          "scikit-image",
          "HOG",
          "Edge Detection",
          "Contour Analysis",
          "Heatmap",
        ],
        image: "assets/images/optimized/project/JALANRUSAK.jpg",
        links: [
          {
            label: "GitHub",
            href: "https://github.com/corneliussatya02/Deteksi-Jalan-Rusak.git",
          },
        ],
      },
      "music-recommendation": {
        number: "05",
        title: "Sistem Rekomendasi Musik",
        category: "Machine Learning / Web App",
        description:
          "Sistem Rekomendasi Musik merupakan proyek pengembangan aplikasi rekomendasi lagu berbasis web menggunakan Flask, Python, Pandas, dan Scikit-learn. Sistem ini dirancang untuk membantu pengguna menemukan lagu yang sesuai dengan preferensi musik berdasarkan judul lagu, nama penyanyi atau band, genre, serta karakteristik audio seperti tempo, energy, danceability, dan positiveness. Dengan menerapkan metode Cosine Similarity dan MinMaxScaler, sistem dapat memberikan rekomendasi lagu yang relevan berdasarkan kemiripan karakteristik musik, sehingga memudahkan pengguna dalam menemukan musik sesuai selera.",
        technologies: [
          "Python",
          "Flask",
          "Pandas",
          "scikit-learn",
          "Content-Based Recommendation",
          "Audio Features",
          "Similarity Matching",
        ],
        image: "assets/images/optimized/project/REKOMMUSIK.jpg",
        links: [
          {
            label: "GitHub",
            href: "https://github.com/corneliussatya02/Sistem-Rekomendasi-Musik.git",
          },
        ],
      },
      "music-events": {
        number: "06",
        title: "Aplikasi Pengelolaan Acara Musik",
        category: "Android / Mobile Development",
        description:
          "Events Manager merupakan aplikasi Android yang menghadirkan pengalaman navigasi praktis dalam pengelolaan agenda dan acara. Mengusung antarmuka yang bersih dan mudah digunakan, aplikasi ini memungkinkan pengguna menyaring daftar acara berdasarkan kriteria status, memantau rincian waktu serta kapasitas lokasi, sekaligus menambahkan acara baru dengan alur interaksi yang efisien.",
        technologies: [
          "Kotlin",
          "Jetpack Compose",
          "Material 3",
          "Retrofit",
          "REST API",
        ],
        image: "assets/images/optimized/project/ANDROID.jpg",
        links: [
          {
            label: "GitHub",
            href: "https://github.com/cahyokml/uas_project.git",
          },
        ],
      },
      "automotive-dashboard": {
        number: "07",
        title: "Automotive Sales Dashboard",
        category: "Business Intelligence / Power BI",
        description:
          "Mengembangkan dashboard interaktif untuk menganalisis data penjualan otomotif menggunakan Microsoft Power BI. Dashboard dirancang untuk memantau performa penjualan berdasarkan periode waktu, cabang, kategori kendaraan, metode pembayaran, dan status transaksi. Proses pengembangan mencakup pengolahan dan visualisasi data, penyusunan Key Performance Indicators (KPI), serta analisis tren penjualan, jumlah transaksi, kuantitas produk, dan tingkat penyelesaian transaksi. Visualisasi interaktif dan filter dinamis membantu mengidentifikasi performa penjualan, memahami pola transaksi, serta mendukung pengambilan keputusan bisnis berbasis data.",
        technologies: [
          "Power BI",
          "KPI",
          "Data Visualization",
          "Interactive Filters",
        ],
        image: "assets/images/optimized/project/AUTOMOTIVE.jpg",
        links: [],
      },
      "br-folk": {
        number: "08",
        title: "BR FOLK",
        category: "E-Commerce / UI/UX Design",
        description:
          "Merancang dan mengembangkan konsep platform e-commerce BR.FOLK untuk jual beli produk sportswear yang memadukan tren olahraga dan gaya hidup anak muda. Platform ini menghadirkan pengalaman belanja digital modern melalui katalog produk, kategori pria, wanita, dan anak-anak, fitur pencarian, serta keranjang belanja. Desain antarmuka yang responsif, navigasi intuitif, dan pengalaman pengguna yang nyaman mendukung eksplorasi koleksi dari berbagai merek olahraga global seperti Nike dan Adidas.",
        technologies: [
          "Figma",
          "UI/UX Design",
          "Prototyping",
          "E-Commerce",
          "Responsive UI",
          "Product Catalog",
          "Shopping Cart",
        ],
        image: "assets/images/optimized/project/BRFOLK.jpg",
        links: [
          {
            label: "Figma",
            href: "https://www.figma.com/proto/2TTkyqE3bYtOAaLsTzgpyi/BR.FOLK?node-id=13-479&t=4CQCSwNmCJuDfjr0-1",
          },
        ],
      },
      "encre-nocturne": {
        number: "09",
        title: "Encre Nocturne",
        category: "Web Development / Tattoo Studio",
        description:
          'Encre Nocturne adalah platform web studio tato modern yang memadukan estetika minimalis dan visual elegan untuk memperkuat identitas seni kontemporer bertajuk "More Than a Tattoo". Landing page interaktif dengan animasi halus, tipografi tegas, dan tata letak monokromatik menghadirkan pengalaman yang imersif dan eksklusif. Pengunjung dapat menjelajahi kategori karya seni, memahami layanan studio, serta melakukan reservasi atau booking dengan mudah dan efisien.',
        technologies: ["HTML", "CSS", "JavaScript"],
        image: "assets/images/optimized/project/TATTOENCRE.jpg",
        links: [
          {
            label: "GitHub",
            href: "https://github.com/corneliussatya02/BookTatto-EncreNocturne.git",
          },
        ],
      },
    };

    if (
      !dialog ||
      !closeButton ||
      !title ||
      !eyebrow ||
      !category ||
      !description ||
      !tags ||
      !actions ||
      !media ||
      !visual ||
      !placeholder
    )
      return;

    function createLink(link) {
      var anchor = document.createElement("a");
      anchor.className = "project-detail__link";
      anchor.href = link.href;
      anchor.target = "_blank";
      anchor.rel = "noopener noreferrer";
      anchor.textContent = link.label;
      return anchor;
    }

    function renderProject(projectId) {
      var project = projects[projectId];
      var projectIndex = projectIds.indexOf(projectId);
      if (!project || projectIndex < 0) return;

      currentProjectId = projectId;
      eyebrow.textContent = "PROJECT / " + project.number;
      title.textContent = project.title;
      category.textContent = project.category;
      description.textContent = project.description;
      tags.replaceChildren();
      actions.replaceChildren();
      visual.replaceChildren();

      if (project.image) {
        var imageBackdrop = document.createElement("img");
        imageBackdrop.className = "project-detail__image-backdrop";
        imageBackdrop.src = project.image;
        imageBackdrop.alt = "";
        imageBackdrop.setAttribute("aria-hidden", "true");

        var image = document.createElement("img");
        image.className = "project-detail__image";
        image.src = project.image;
        image.alt = "Dokumentasi proyek " + project.title;
        image.loading = "eager";
        image.decoding = "async";
        image.addEventListener("error", function () {
          visual.replaceChildren(placeholder);
        });
        visual.appendChild(imageBackdrop);
        visual.appendChild(image);
      } else {
        visual.appendChild(placeholder);
      }

      project.technologies.forEach(function (technology) {
        var tag = document.createElement("li");
        tag.textContent = technology;
        tag.style.setProperty(
          "--tech-color",
          technologyColors[technology] || "#64748b",
        );
        tags.appendChild(tag);
      });

      project.links.forEach(function (link) {
        if (!link.href) return;
        actions.appendChild(createLink(link));
      });
      actions.hidden = actions.childElementCount === 0;
      navigationButtons.forEach(function (button) {
        var direction = Number(button.getAttribute("data-project-direction"));
        var neighborIndex =
          (projectIndex + direction + projectIds.length) % projectIds.length;
        var neighbor = projects[projectIds[neighborIndex]];
        button.setAttribute(
          "aria-label",
          "Buka proyek " +
            (direction < 0 ? "sebelumnya: " : "berikutnya: ") +
            neighbor.title,
        );
        button.title = neighbor.title;
      });
    }

    var projectIds = Object.keys(projects);
    var currentProjectId;
    warmImageCache(
      projectIds
        .map(function (projectId) {
          return projects[projectId].image;
        })
        .filter(Boolean),
    );

    document.addEventListener("click", function (event) {
      var trigger = event.target.closest("[data-project-id]");
      if (!trigger) return;

      var projectId = trigger.getAttribute("data-project-id");
      if (!projects[projectId]) return;

      lastTrigger = trigger;
      renderProject(projectId);

      if (!dialog.open) dialog.showModal();
    });

    navigationButtons.forEach(function (button) {
      button.addEventListener("click", function () {
        var direction = Number(button.getAttribute("data-project-direction"));
        var currentIndex = projectIds.indexOf(currentProjectId);
        var nextIndex =
          (currentIndex + direction + projectIds.length) % projectIds.length;
        renderProject(projectIds[nextIndex]);
      });
    });

    closeButton.addEventListener("click", function () {
      dialog.close();
    });

    dialog.addEventListener("click", function (event) {
      if (event.target === dialog) dialog.close();
    });

    dialog.addEventListener("keydown", function (event) {
      if (event.key !== "ArrowLeft" && event.key !== "ArrowRight") return;
      if (
        event.target.closest(
          "input, textarea, select, [contenteditable='true']",
        )
      )
        return;
      event.preventDefault();
      var direction = event.key === "ArrowRight" ? 1 : -1;
      var currentIndex = projectIds.indexOf(currentProjectId);
      var nextIndex =
        (currentIndex + direction + projectIds.length) % projectIds.length;
      renderProject(projectIds[nextIndex]);
    });

    dialog.addEventListener("close", function () {
      if (lastTrigger) lastTrigger.focus({ preventScroll: true });
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
    var lastRenderTimestamp;
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
            Math.min(
              baseFontSize,
              baseFontSize * (availableWidth / widestWord),
            ),
          );

          label.style.fontSize = fittedFontSize.toFixed(2) + "px";
        }
      });
      radiusX =
        Math.max(0, (windowElement.clientWidth - cardWidth) / 2) *
        parseFloat(
          window
            .getComputedStyle(windowElement)
            .getPropertyValue("--arc-radius-x"),
        );
      radiusY = Math.max(0, (windowElement.clientHeight - cardHeight) / 2 - 8);
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
        card.style.setProperty("--carousel-opacity", opacity.toFixed(3));
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
        lastRenderTimestamp = undefined;
        return;
      }

      if (lastRenderTimestamp === undefined) lastRenderTimestamp = timestamp;
      if (timestamp - lastRenderTimestamp < 1000 / 30) {
        animationFrame = window.requestAnimationFrame(animateCarousel);
        return;
      }

      if (lastTimestamp === undefined) lastTimestamp = timestamp;
      var elapsed = Math.min(timestamp - lastTimestamp, 64);
      lastTimestamp = timestamp;
      lastRenderTimestamp = timestamp;
      progress = (progress + elapsed / 78000) % 1;
      positionCards(progress);
      animationFrame = window.requestAnimationFrame(animateCarousel);
    }

    function updateAnimationState() {
      if (!canAnimate()) {
        window.cancelAnimationFrame(animationFrame);
        animationFrame = undefined;
        lastTimestamp = undefined;
        lastRenderTimestamp = undefined;
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
    initDocumentViewer();
    initProjectDetails();
    initProfileTilt();
    initTechStackCarousel();
    initScrollProgress();
    initScrollReveal();
  });
})();
