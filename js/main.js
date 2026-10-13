(function () {
    'use strict';

    var prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    var themeChangeTimeout;

    function initSmoothScroll() {
        document.querySelectorAll('a[href^="#"]').forEach(function (link) {
            link.addEventListener('click', function (event) {
                var targetId = link.getAttribute('href');
                if (!targetId || targetId === '#') return;

                var targetElement = document.querySelector(targetId);
                if (!targetElement) return;

                event.preventDefault();
                targetElement.scrollIntoView({ behavior: prefersReducedMotion ? 'auto' : 'smooth', block: 'start' });
            });
        });
    }

    function getStoredTheme() {
        try {
            return localStorage.getItem('portfolio-theme');
        } catch (error) {
            return null;
        }
    }

    function storeTheme(theme) {
        try {
            localStorage.setItem('portfolio-theme', theme);
        } catch (error) {
            return;
        }
    }

    function setTheme(theme, toggle) {
        var isDark = theme === 'dark';
        document.documentElement.classList.toggle('is-dark', isDark);
        document.body.classList.toggle('is-dark', isDark);
        toggle.setAttribute('aria-pressed', String(isDark));
        toggle.setAttribute('aria-label', isDark ? 'Aktifkan light mode' : 'Aktifkan dark mode');
        toggle.querySelector('.site-theme-toggle__label').textContent = isDark ? 'DARK MODE' : 'LIGHT MODE';
        toggle.querySelector('.site-theme-toggle__icon').textContent = isDark ? '\u263C' : '\u25D0';
    }

    function initThemeToggle() {
        var toggle = document.querySelector('.site-theme-toggle');
        if (!toggle) return;

        var savedTheme = getStoredTheme();
        setTheme(savedTheme === 'dark' ? 'dark' : 'light', toggle);

        toggle.addEventListener('click', function () {
            var nextTheme = document.body.classList.contains('is-dark') ? 'light' : 'dark';
            setTheme(nextTheme, toggle);
            storeTheme(nextTheme);

            if (prefersReducedMotion) return;

            window.clearTimeout(themeChangeTimeout);
            document.body.classList.add('is-theme-changing');
            themeChangeTimeout = window.setTimeout(function () {
                document.body.classList.remove('is-theme-changing');
            }, 450);
        });
    }

    function initTabs() {
        var tabs = Array.from(document.querySelectorAll('.about-tab[role="tab"]'));
        var panels = Array.from(document.querySelectorAll('.about-tab-panel[role="tabpanel"]'));
        var transitionTimeout;
        var activeTab = tabs.find(function (tab) {
            return tab.getAttribute('aria-selected') === 'true';
        });
        var activePanel;

        if (!tabs.length || !panels.length || !activeTab) return;

        activePanel = panels.find(function (panel) {
            return panel.id === activeTab.getAttribute('aria-controls');
        });

        if (!activePanel) return;

        function updateTabState(tab) {
            tabs.forEach(function (tabButton) {
                var isSelected = tabButton === tab;
                tabButton.classList.toggle('is-active', isSelected);
                tabButton.setAttribute('aria-selected', String(isSelected));
                tabButton.tabIndex = isSelected ? 0 : -1;
            });
        }

        function resetPanel(panel, hidden) {
            panel.classList.remove('is-entering', 'is-leaving', 'is-transitioning', 'is-active');
            panel.style.removeProperty('--tab-enter-offset');
            panel.style.removeProperty('--tab-exit-offset');
            panel.hidden = hidden;
        }

        function activateTab(tab) {
            var nextPanel = panels.find(function (panel) {
                return panel.id === tab.getAttribute('aria-controls');
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
                nextPanel.classList.add('is-active');
                activeTab = tab;
                activePanel = nextPanel;
                return;
            }

            nextPanel.hidden = false;
            nextPanel.classList.remove('is-leaving', 'is-transitioning', 'is-active');
            nextPanel.classList.add('is-entering');
            nextPanel.style.setProperty('--tab-enter-offset', direction * 10 + '%');
            nextPanel.style.setProperty('--tab-exit-offset', direction * -10 + '%');

            activePanel.classList.remove('is-entering', 'is-transitioning');
            activePanel.classList.add('is-leaving');
            activePanel.style.setProperty('--tab-enter-offset', direction * 10 + '%');
            activePanel.style.setProperty('--tab-exit-offset', direction * -10 + '%');

            activeTab = tab;
            activePanel = nextPanel;

            window.requestAnimationFrame(function () {
                if (activePanel !== nextPanel) return;
                nextPanel.classList.add('is-transitioning');
                panels.forEach(function (panel) {
                    if (panel.classList.contains('is-leaving')) {
                        panel.classList.add('is-transitioning');
                    }
                });
            });

            transitionTimeout = window.setTimeout(function () {
                panels.forEach(function (panel) {
                    if (panel !== nextPanel && panel.classList.contains('is-leaving')) {
                        resetPanel(panel, true);
                    }
                });
                nextPanel.classList.remove('is-entering', 'is-transitioning');
                nextPanel.classList.add('is-active');
                nextPanel.style.removeProperty('--tab-enter-offset');
                nextPanel.style.removeProperty('--tab-exit-offset');
            }, 420);
        }

        updateTabState(activeTab);
        panels.forEach(function (panel) {
            resetPanel(panel, panel !== activePanel);
        });
        activePanel.classList.add('is-active');

        tabs.forEach(function (tab) {
            tab.addEventListener('click', function () {
                activateTab(tab);
            });

            tab.addEventListener('keydown', function (event) {
                var currentIndex = tabs.indexOf(tab);
                var nextIndex;

                if (event.key === 'Home') {
                    event.preventDefault();
                    tabs[0].focus();
                    activateTab(tabs[0]);
                    return;
                }

                if (event.key === 'End') {
                    event.preventDefault();
                    tabs[tabs.length - 1].focus();
                    activateTab(tabs[tabs.length - 1]);
                    return;
                }

                if (event.key !== 'ArrowRight' && event.key !== 'ArrowLeft') return;

                event.preventDefault();
                var direction = event.key === 'ArrowRight' ? 1 : -1;
                nextIndex = (currentIndex + direction + tabs.length) % tabs.length;
                tabs[nextIndex].focus();
                activateTab(tabs[nextIndex]);
            });
        });
    }

    function initProfileTilt() {
        var profile = document.querySelector('.about-profile');
        var animationFrame;
        var pointerX;
        var pointerY;

        if (!profile || prefersReducedMotion || !window.matchMedia('(hover: hover) and (pointer: fine)').matches) return;

        function updateTilt() {
            var bounds = profile.getBoundingClientRect();
            var horizontalPosition = (pointerX - bounds.left) / bounds.width - 0.5;
            var verticalPosition = (pointerY - bounds.top) / bounds.height - 0.5;

            profile.style.setProperty('--profile-rotate-x', (-verticalPosition * 2.8).toFixed(2) + 'deg');
            profile.style.setProperty('--profile-rotate-y', (horizontalPosition * 2.8).toFixed(2) + 'deg');
            animationFrame = undefined;
        }

        function resetTilt() {
            window.cancelAnimationFrame(animationFrame);
            animationFrame = undefined;
            profile.classList.remove('is-tilting');
            profile.style.removeProperty('--profile-rotate-x');
            profile.style.removeProperty('--profile-rotate-y');
        }

        profile.addEventListener('pointerenter', function (event) {
            if (event.pointerType && event.pointerType !== 'mouse') return;
            profile.classList.add('is-tilting');
        });

        profile.addEventListener('pointermove', function (event) {
            if (event.pointerType && event.pointerType !== 'mouse') return;
            pointerX = event.clientX;
            pointerY = event.clientY;

            if (!animationFrame) {
                animationFrame = window.requestAnimationFrame(updateTilt);
            }
        });

        profile.addEventListener('pointerleave', resetTilt);
    }

    function initScrollProgress() {
        var progress = document.createElement('div');
        var progressBar = document.createElement('span');
        var isTicking = false;

        progress.className = 'scroll-progress';
        progress.setAttribute('aria-hidden', 'true');
        progress.appendChild(progressBar);
        document.body.appendChild(progress);

        function updateProgress() {
            var scrollableHeight = document.documentElement.scrollHeight - window.innerHeight;
            var progressValue = scrollableHeight > 0 ? Math.min(window.scrollY / scrollableHeight, 1) : 0;
            progressBar.style.transform = 'scaleX(' + progressValue + ')';
            isTicking = false;
        }

        function requestProgressUpdate() {
            if (isTicking) return;
            isTicking = true;
            window.requestAnimationFrame(updateProgress);
        }

        updateProgress();
        window.addEventListener('scroll', requestProgressUpdate, { passive: true });
        window.addEventListener('resize', requestProgressUpdate);
    }

    function initScrollReveal() {
        var selectors = [
            '.about-section__header',
            '.about-profile',
            '.about-tabs',
            '.about-tab-panels',
            '.projects-intro',
            '.projects-heading',
            '.project--featured',
            '.project-item'
        ];
        var revealElements = Array.from(document.querySelectorAll(selectors.join(',')));

        revealElements.forEach(function (element, index) {
            element.classList.add('js-reveal');
            element.style.setProperty('--reveal-delay', (index % 4) * 70 + 'ms');
        });

        if (prefersReducedMotion || !('IntersectionObserver' in window)) {
            revealElements.forEach(function (element) {
                element.classList.add('is-visible');
            });
            return;
        }

        var observer = new IntersectionObserver(function (entries) {
            entries.forEach(function (entry) {
                if (!entry.isIntersecting) return;
                entry.target.classList.add('is-visible');
                observer.unobserve(entry.target);
            });
        }, {
            threshold: 0.14,
            rootMargin: '0px 0px -40px'
        });

        revealElements.forEach(function (element) {
            observer.observe(element);
        });
    }

    document.addEventListener('DOMContentLoaded', function () {
        initSmoothScroll();
        initThemeToggle();
        initTabs();
        initProfileTilt();
        initScrollProgress();
        initScrollReveal();
    });
}());
