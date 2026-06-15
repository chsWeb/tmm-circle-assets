(() => {
  const handledSplashes = new WeakSet();

  const resetCircleShellPadding = (splash) => {
    splash.closest(".wb-p-5")?.classList.add("tmm-experience-shell-reset");
  };

  const getAutoAdvanceDelay = (splash) => {
    const delayValue = getComputedStyle(splash)
      .getPropertyValue("--tmm-experience-auto-advance-delay")
      .trim();
    const parsedDelay = Number.parseFloat(delayValue);

    return delayValue.endsWith("s") && !delayValue.endsWith("ms")
      ? parsedDelay * 1000
      : parsedDelay || 2000;
  };

  const getAutoAdvanceDuration = (splash) => {
    const durationValue = getComputedStyle(splash)
      .getPropertyValue("--tmm-experience-auto-advance-duration")
      .trim();
    const parsedDuration = Number.parseFloat(durationValue);

    return durationValue.endsWith("s") && !durationValue.endsWith("ms")
      ? parsedDuration * 1000
      : parsedDuration || 1500;
  };

  const easeInOutCubic = (progress) => {
    return progress < 0.5
      ? 4 * progress * progress * progress
      : 1 - Math.pow(-2 * progress + 2, 3) / 2;
  };

  const scrollToTarget = (target, duration) => {
    const startY = window.scrollY;
    const targetY = target.getBoundingClientRect().top + window.scrollY;
    const maxY = document.documentElement.scrollHeight - window.innerHeight;
    const endY = Math.max(0, Math.min(targetY, maxY));
    const distance = endY - startY;
    const startTime = window.performance.now();

    if (Math.abs(distance) < 2) {
      return;
    }

    const step = (now) => {
      const elapsed = now - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const easedProgress = easeInOutCubic(progress);

      window.scrollTo(0, startY + distance * easedProgress);

      if (progress < 1) {
        window.requestAnimationFrame(step);
      }
    };

    window.requestAnimationFrame(step);
  };

  const isMobileIntro = () => {
    return window.matchMedia("(max-width: 767px)").matches;
  };

  const isVisibleElement = (element) => {
    const style = getComputedStyle(element);
    const rect = element.getBoundingClientRect();

    return (
      style.display !== "none" &&
      style.visibility !== "hidden" &&
      Number.parseFloat(style.opacity) !== 0 &&
      rect.width > 0 &&
      rect.height > 40
    );
  };

  const findAutoAdvanceTarget = (splash) => {
    const targetSelector = splash.getAttribute("data-auto-advance-target");

    if (targetSelector) {
      const explicitTarget = document.querySelector(targetSelector);

      if (explicitTarget) {
        return explicitTarget;
      }
    }

    let sibling = splash.nextElementSibling;

    while (sibling) {
      if (!["SCRIPT", "STYLE"].includes(sibling.tagName) && isVisibleElement(sibling)) {
        return sibling;
      }

      sibling = sibling.nextElementSibling;
    }

    const splashBottom = splash.getBoundingClientRect().bottom;
    const candidates = [...document.body.querySelectorAll("main, section, article, div, header, footer")]
      .filter((element) => {
        if (element === splash || splash.contains(element) || element.contains(splash)) {
          return false;
        }

        const rect = element.getBoundingClientRect();

        return rect.top >= splashBottom - 4 && isVisibleElement(element);
      })
      .sort((a, b) => a.getBoundingClientRect().top - b.getBoundingClientRect().top);

    return candidates[0] || null;
  };

  const scheduleAutoAdvance = (splash) => {
    let userInterrupted = false;
    const markInterrupted = () => {
      userInterrupted = true;
    };
    const options = { once: true, passive: true };

    window.addEventListener("wheel", markInterrupted, options);
    window.addEventListener("touchstart", markInterrupted, options);
    window.addEventListener("keydown", markInterrupted, { once: true });

    window.setTimeout(() => {
      window.removeEventListener("wheel", markInterrupted);
      window.removeEventListener("touchstart", markInterrupted);
      window.removeEventListener("keydown", markInterrupted);

      if (userInterrupted || window.scrollY > splash.getBoundingClientRect().top + window.scrollY + 24) {
        return;
      }

      if (isMobileIntro()) {
        const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

        if (prefersReducedMotion) {
          splash.classList.add("is-dismissed");
          return;
        }

        splash.classList.add("is-exiting");
        window.setTimeout(() => {
          splash.classList.add("is-dismissed");
        }, getAutoAdvanceDuration(splash) + 150);
        splash.addEventListener(
          "transitionend",
          (event) => {
            if (event.propertyName === "max-height") {
              splash.classList.add("is-dismissed");
            }
          },
          { once: true }
        );
        return;
      }

      const target = findAutoAdvanceTarget(splash);

      if (!target) {
        return;
      }

      const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

      if (prefersReducedMotion) {
        target.scrollIntoView({ behavior: "auto", block: "start" });
        return;
      }

      scrollToTarget(target, getAutoAdvanceDuration(splash));
    }, getAutoAdvanceDelay(splash));
  };

  const completeExperienceSplash = (root = document) => {
    root.querySelectorAll(".tmm-experience-splash:not(.is-complete)").forEach((splash) => {
      if (handledSplashes.has(splash)) {
        return;
      }

      handledSplashes.add(splash);
      resetCircleShellPadding(splash);
      scheduleAutoAdvance(splash);

      const animatedItems = splash.querySelectorAll(
        ".tmm-experience-splash__logo, .tmm-experience-splash__word, .tmm-experience-splash__tagline"
      );
      let finishedItems = 0;

      animatedItems.forEach((item) => {
        item.addEventListener(
          "animationend",
          () => {
            finishedItems += 1;

            if (finishedItems === animatedItems.length) {
              splash.classList.add("is-complete");
            }
          },
          { once: true }
        );
      });
    });
  };

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", () => completeExperienceSplash(), { once: true });
  } else {
    completeExperienceSplash();
  }

  new MutationObserver((mutations) => {
    mutations.forEach((mutation) => {
      mutation.addedNodes.forEach((node) => {
        if (node.nodeType === 1) {
          completeExperienceSplash(node);
        }
      });
    });
  }).observe(document.documentElement, { childList: true, subtree: true });
})();
