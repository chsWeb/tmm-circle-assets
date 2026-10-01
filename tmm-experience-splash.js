(() => {
  /* Circle's iOS app lays a translucent, blurred header and tab bar OVER the
     webview rather than beside it, so anything at the very top or bottom of
     our markup renders under frosted glass — the progress bar was coming out
     blurred and washed. window.isInsideCircleMobileWebview is Circle's own
     documented flag for that surface, so the class goes on <html> and the
     stylesheet gives those sections real chrome offsets. Every rule that
     needs to already reads --tmm-chrome-offset / --tmm-chrome-bottom.

     Set before anything else runs: it changes layout, so it must not land
     after the first paint. */
  if (window.isInsideCircleMobileWebview) {
    document.documentElement.classList.add("tmm-in-app");
  }

  /* One-screenshot diagnostic. Nothing here can see how tall Circle's
     back-button header is inside the branded app, and no CSS can tell that
     webview apart from mobile Safari, so the numbers have to come from the
     device once. Add ?tmmdebug=1 to the page URL in the app and screenshot
     this panel.

     Gated on the query string, so members never see it. */
  if (/[?&]tmmdebug=1\b/.test(window.location.search)) {
    const lines = () => {
      const probe = document.createElement("div");
      probe.style.cssText =
        "position:fixed;top:0;left:0;width:1px;visibility:hidden;" +
        "height:env(safe-area-inset-top)";
      document.body.appendChild(probe);
      const top = probe.getBoundingClientRect().height;
      probe.style.height = "env(safe-area-inset-bottom)";
      const bottom = probe.getBoundingClientRect().height;
      probe.remove();

      const bar = document.querySelector(".tmm-intro__progress");
      const barTop = bar ? Math.round(bar.getBoundingClientRect().top) : "n/a";

      return [
        "safe-area top: " + top + "px",
        "safe-area bottom: " + bottom + "px",
        "innerHeight: " + window.innerHeight,
        "dpr: " + window.devicePixelRatio,
        "webviewFlag: " + typeof window.isInsideCircleMobileWebview,
        "circleUser: " + typeof window.circleUser,
        "progress bar top: " + barTop + "px",
        "UA: " + navigator.userAgent,
      ];
    };

    const panel = document.createElement("pre");
    panel.style.cssText =
      "position:fixed;z-index:99999;inset:auto 8px 8px 8px;margin:0;" +
      "padding:10px 12px;border-radius:8px;background:rgba(15,15,15,.92);" +
      "color:#F4EDDB;font:11px/1.45 ui-monospace,Menlo,monospace;" +
      "white-space:pre-wrap;word-break:break-all;max-height:45vh;overflow:auto";
    const paint = () => { panel.textContent = lines().join("\n"); };
    document.addEventListener("DOMContentLoaded", () => {
      document.body.appendChild(panel);
      paint();
    });
    window.addEventListener("resize", paint);
  }

  const handledSplashes = new WeakSet();
  const handledWelcomeSections = new WeakSet();
  const handledPricingSections = new WeakSet();
  const handledPhotoDecks = new WeakSet();

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

  /* Can this document scroll itself? Inside Circle our markup is an iframe
     sized to its own content, so the frame has nothing to scroll and
     window.scrollTo is a silent no-op — the parent document is what moves.
     scrollToTarget even bails early there, because its clamped distance
     rounds to zero. */
  const canScrollSelf = () =>
    document.documentElement.scrollHeight > window.innerHeight + 2;

  /* scrollIntoView is the only thing that can ask a cross-origin parent to
     scroll, so it owns the embedded case. The eased scroll is kept for a
     standalone page, where it is nicer and can honour the header offset. */
  const scrollToSection = (target) => {
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    if (reduce || !canScrollSelf()) {
      target.scrollIntoView({ behavior: reduce ? "auto" : "smooth", block: "start" });
      if (canScrollSelf()) {
        window.scrollBy(0, -getScrollOffset());
      }
      return;
    }

    scrollToTarget(target, 950, getScrollOffset());
  };

  /* Circle's sanitiser can drop id attributes from pasted markup, and a
     missing target used to make these links do nothing at all. Each section
     also carries a class of the same name, so fall back to that. */
  const anchorTarget = (hash) =>
    document.querySelector(hash) || document.querySelector(`.${hash.slice(1)}`);

  const bindAnchorLinks = (section) => {
    section.querySelectorAll('a[href^="#"]').forEach((link) => {
      link.addEventListener("click", (event) => {
        const target = anchorTarget(link.getAttribute("href"));

        if (!target) {
          console.warn("[tmm-splash] no target for", link.getAttribute("href"));
          return;
        }

        event.preventDefault();
        scrollToSection(target);
      });
    });
  };

  const scrollToTarget = (target, duration, offset = 0) => {
    const startY = window.scrollY;
    const targetY = target.getBoundingClientRect().top + window.scrollY - offset;
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

  const getScrollOffset = () => {
    const rawValue = getComputedStyle(document.documentElement)
      .getPropertyValue("--tmm-scroll-offset")
      .trim();
    const parsedValue = Number.parseFloat(rawValue);

    return Number.isFinite(parsedValue) ? parsedValue : 92;
  };

  const completeExperienceSplash = (root = document) => {
    root.querySelectorAll(".tmm-experience-splash:not(.is-complete)").forEach((splash) => {
      if (handledSplashes.has(splash)) {
        return;
      }

      handledSplashes.add(splash);
      resetCircleShellPadding(splash);
      scheduleAutoAdvance(splash);

      const animatedItems = splash.querySelectorAll(".tmm-experience-splash__logo");
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

  const setupPricingSections = (root = document) => {
    root.querySelectorAll(".tmm-pricing").forEach((section) => {
      if (handledPricingSections.has(section)) {
        return;
      }

      handledPricingSections.add(section);

      const carousel = section.querySelector(".tmm-pricing__plans");
      const cards = [...section.querySelectorAll(".tmm-pricing-card")];
      const dots = [...section.querySelectorAll(".tmm-pricing__dot")];

      if (!carousel || cards.length === 0 || dots.length === 0) {
        return;
      }

      const updateDots = () => {
        const carouselLeft = carousel.getBoundingClientRect().left;
        let activeIndex = 0;
        let nearestDistance = Number.POSITIVE_INFINITY;

        cards.forEach((card, index) => {
          const distance = Math.abs(card.getBoundingClientRect().left - carouselLeft);

          if (distance < nearestDistance) {
            nearestDistance = distance;
            activeIndex = index;
          }
        });

        dots.forEach((dot, index) => {
          dot.setAttribute("aria-current", String(index === activeIndex));
        });
      };

      dots.forEach((dot) => {
        dot.addEventListener("click", () => {
          const index = Number.parseInt(dot.dataset.pricingSlide || "0", 10);
          const targetCard = cards[index];

          if (!targetCard) {
            return;
          }

          carousel.scrollTo({
            left: targetCard.offsetLeft - carousel.offsetLeft,
            behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth",
          });
        });
      });

      let scrollFrame = null;
      carousel.addEventListener(
        "scroll",
        () => {
          if (scrollFrame) {
            window.cancelAnimationFrame(scrollFrame);
          }

          scrollFrame = window.requestAnimationFrame(updateDots);
        },
        { passive: true }
      );

      window.addEventListener("resize", updateDots);
      updateDots();
    });
  };

  const setupPhotoDecks = (root = document) => {
    root.querySelectorAll("[data-tmm-photo-deck]").forEach((deck) => {
      if (handledPhotoDecks.has(deck)) {
        return;
      }

      handledPhotoDecks.add(deck);

      const originalCards = [...deck.querySelectorAll("[data-tmm-deck-card]")];
      let cards = [...originalCards];
      const cardCount = originalCards.length;
      const dotsContainer = deck.parentElement?.querySelector("[data-tmm-deck-dots]");
      const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
      const restStates = [
        { x: 0, y: 0, rotate: 0, scale: 1, opacity: 1 },
        { x: -28, y: 8, rotate: -5, scale: 0.93, opacity: 1 },
        { x: 28, y: 20, rotate: 5, scale: 0.86, opacity: 1 },
        { x: 0, y: 30, rotate: 1, scale: 0.82, opacity: 0 },
      ];
      let isAnimating = false;
      let activePointer = null;
      let dots = [];

      originalCards.forEach((card, index) => {
        card.dataset.deckIndex = String(index);
      });

      const getRestState = (depth) => {
        return restStates[Math.min(depth, restStates.length - 1)];
      };

      const getRestTransform = (depth) => {
        const state = getRestState(depth);

        return `translate3d(${state.x}px, ${state.y}px, 0) rotate(${state.rotate}deg) scale(${state.scale})`;
      };

      const applyCardState = (card, depth, animate = true, transitionValue = "") => {
        const state = getRestState(depth);

        card.style.transition = animate ? transitionValue : "none";
        card.style.transform = getRestTransform(depth);
        card.style.opacity = String(state.opacity);
        card.style.zIndex = String(cardCount - depth);
        card.tabIndex = depth === 0 ? 0 : -1;
        card.setAttribute("aria-hidden", String(depth !== 0));
      };

      const updateDots = () => {
        const activeIndex = cards[0]?.dataset.deckIndex;

        dots.forEach((dot) => {
          dot.setAttribute("aria-current", String(dot.dataset.deckIndex === activeIndex));
        });
      };

      const renderDeck = (animate = true) => {
        cards.forEach((card, depth) => {
          applyCardState(card, depth, animate);
        });
        updateDots();

        if (!animate) {
          window.requestAnimationFrame(() => {
            cards.forEach((card) => {
              card.style.transition = "";
            });
          });
        }
      };

      const reorderForTarget = (direction, targetCard = null) => {
        const currentIndex = Number.parseInt(cards[0]?.dataset.deckIndex || "0", 10);
        const targetIndex = targetCard
          ? Number.parseInt(targetCard.dataset.deckIndex || "0", 10)
          : (currentIndex + (direction < 0 ? 1 : -1) + cardCount) % cardCount;

        cards = Array.from(
          { length: cardCount },
          (_, offset) => originalCards[(targetIndex + offset) % cardCount]
        );
      };

      const dismissCard = (
        card,
        direction,
        releaseX = 0,
        releaseY = 0,
        targetCard = null,
        animate = true
      ) => {
        if (isAnimating || cards[0] !== card) {
          return;
        }

        if (reducedMotion.matches || !animate) {
          reorderForTarget(direction, targetCard);
          renderDeck(false);
          cards[0]?.focus({ preventScroll: true });
          return;
        }

        isAnimating = true;
        const deckWidth = deck.getBoundingClientRect().width;
        const exitX =
          direction * Math.max(deckWidth * 0.56, Math.abs(releaseX) + deckWidth * 0.14);
        const exitY = releaseY * 0.22;

        card.style.transition =
          "transform 250ms cubic-bezier(0.4, 0, 1, 1), box-shadow 180ms cubic-bezier(0.4, 0, 1, 1)";
        card.style.transform =
          `translate3d(${exitX}px, ${exitY}px, 0) ` +
          `rotate(${direction * 8}deg) skewY(${direction * -1.4}deg) scale(0.985)`;

        window.setTimeout(() => {
          reorderForTarget(direction, targetCard);
          const settleTransition =
            "transform 380ms cubic-bezier(0.16, 1, 0.3, 1), opacity 220ms cubic-bezier(0.16, 1, 0.3, 1)";

          cards.forEach((deckCard, depth) => {
            applyCardState(deckCard, depth, true, settleTransition);
          });
          updateDots();
        }, 250);

        window.setTimeout(() => {
          applyCardState(card, cards.indexOf(card), false);
          window.requestAnimationFrame(() => {
            card.style.transition = "";
          });
          isAnimating = false;
        }, 640);
      };

      if (dotsContainer) {
        dots = cards.map((card, index) => {
          const dot = document.createElement("button");

          dot.type = "button";
          dot.className = "tmm-drag-deck__dot";
          dot.dataset.deckIndex = String(index);
          dot.setAttribute("aria-label", `Show photograph ${index + 1}`);
          dot.setAttribute("aria-current", String(index === 0));
          dot.addEventListener("click", () => {
            if (isAnimating || cards[0] === card) {
              return;
            }

            const currentIndex = Number.parseInt(cards[0]?.dataset.deckIndex || "0", 10);
            const direction = index >= currentIndex ? 1 : -1;

            dismissCard(cards[0], direction, 0, 0, card);
          });
          dotsContainer.appendChild(dot);

          return dot;
        });
      }

      cards.forEach((card) => {
        card.draggable = false;

        card.addEventListener("pointerdown", (event) => {
          if (isAnimating || reducedMotion.matches || cards[0] !== card) {
            return;
          }

          event.preventDefault();
          card.setPointerCapture(event.pointerId);
          card.classList.add("is-dragging");

          activePointer = {
            id: event.pointerId,
            startX: event.clientX,
            startY: event.clientY,
            lastX: event.clientX,
            lastTime: event.timeStamp,
            velocityX: 0,
          };
        });

        card.addEventListener("pointermove", (event) => {
          if (!activePointer || activePointer.id !== event.pointerId || cards[0] !== card) {
            return;
          }

          const elapsed = Math.max(event.timeStamp - activePointer.lastTime, 1);
          const dx = event.clientX - activePointer.startX;
          const dy = event.clientY - activePointer.startY;
          const damping = 1 / (1 + Math.max(Math.abs(dx) - 160, 0) / 420);
          const edgeThreshold = deck.getBoundingClientRect().width * 0.24;
          const edgeProgress = Math.min(
            Math.max((Math.abs(dx) - edgeThreshold * 0.45) / (edgeThreshold * 0.75), 0),
            1
          );
          const edgeDirection = Math.sign(dx || 1);
          const edgeScale = 1 - edgeProgress * 0.012;
          const edgeSkew = edgeDirection * edgeProgress * -1.3;

          activePointer.velocityX = (event.clientX - activePointer.lastX) / elapsed;
          activePointer.lastX = event.clientX;
          activePointer.lastTime = event.timeStamp;

          card.style.transform =
            `translate3d(${dx * damping}px, ${dy * 0.3}px, 0) ` +
            `rotate(${dx / 20}deg) skewY(${edgeSkew}deg) scale(${edgeScale})`;
        });

        const finishPointer = (event) => {
          if (!activePointer || activePointer.id !== event.pointerId || cards[0] !== card) {
            return;
          }

          const dx = event.clientX - activePointer.startX;
          const dy = event.clientY - activePointer.startY;
          const velocityX = activePointer.velocityX;
          const threshold = deck.getBoundingClientRect().width * 0.24;
          const shouldDismiss = Math.abs(dx) > threshold || Math.abs(velocityX) > 0.65;
          const direction = Math.sign(dx || velocityX || 1);

          activePointer = null;
          card.classList.remove("is-dragging");

          if (card.hasPointerCapture(event.pointerId)) {
            card.releasePointerCapture(event.pointerId);
          }

          if (shouldDismiss) {
            dismissCard(card, direction, dx, dy);
            return;
          }

          card.style.transition =
            "transform 540ms cubic-bezier(0.16, 1, 0.3, 1), box-shadow 220ms cubic-bezier(0.16, 1, 0.3, 1)";
          card.style.transform = getRestTransform(0);
        };

        card.addEventListener("pointerup", finishPointer);
        card.addEventListener("pointercancel", finishPointer);

        card.addEventListener("keydown", (event) => {
          if (cards[0] !== card || !["ArrowLeft", "ArrowRight", "Enter", " "].includes(event.key)) {
            return;
          }

          event.preventDefault();
          const direction = event.key === "ArrowLeft" ? 1 : -1;

          dismissCard(card, direction, 0, 0, null, false);
        });
      });

      renderDeck(false);
    });
  };

  const setupWelcomeSections = (root = document) => {
    root.querySelectorAll(".tmm-welcome").forEach((section) => {
      if (handledWelcomeSections.has(section)) {
        return;
      }

      handledWelcomeSections.add(section);

      const markVisible = () => {
        section.classList.add("is-visible");
      };

      if ("IntersectionObserver" in window) {
        const observer = new IntersectionObserver(
          (entries) => {
            entries.forEach((entry) => {
              if (entry.isIntersecting) {
                markVisible();
              }
            });
          },
          { threshold: 0.08 }
        );

        observer.observe(section);
      } else {
        markVisible();
      }

      section.querySelectorAll(".tmm-welcome__photo").forEach((photo) => {
        photo.addEventListener(
          "transitionend",
          () => {
            section.classList.add("is-motion-complete");
          },
          { once: true }
        );
      });

      bindAnchorLinks(section);
    });
  };

  const handledIntroCarousels = new WeakSet();

  const setupIntroCarousels = (root = document) => {
    root.querySelectorAll(".tmm-intro, .tmm-join").forEach((section) => {
      if (handledIntroCarousels.has(section)) {
        return;
      }

      handledIntroCarousels.add(section);

      bindAnchorLinks(section);

      const track = section.querySelector(".tmm-intro__track");
      const slides = [...section.querySelectorAll(".tmm-intro__slide")];
      const segments = [...section.querySelectorAll(".tmm-intro__segment")];
      /* v2 gives every slide its own nav row, so there are three of each
         chevron rather than one. querySelector would have bound only the
         first slide's pair, leaving the other two inert. */
      const prevButtons = [...section.querySelectorAll(".tmm-intro__nav--prev")];
      const nextButtons = [...section.querySelectorAll(".tmm-intro__nav--next")];
      /* Dots carry data-intro-slide exactly as the v1 segments do. Their
         current state is hardcoded per slide in the markup, so nothing here
         has to update them. */
      const jumpers = [...section.querySelectorAll("[data-intro-slide]")];

      // Only the track and slides are essential. The progress bar and
      // chevrons are optional, so stale pasted markup degrades to a
      // carousel that still fades and swipes rather than dying outright.
      if (!track || slides.length === 0) {
        return;
      }

      // Cross-fade rather than a scrolling track: slides are stacked and
      // only opacity changes, so the subtitle and photo dissolve into the
      // next pair instead of travelling sideways. Swipe is handled here
      // because there is no native scrolling left to piggyback on.
      const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
      let index = 0;

      const render = () => {
        slides.forEach((slide, i) => {
          const isActive = i === index;

          slide.classList.toggle("is-active", isActive);
          slide.setAttribute("aria-hidden", String(!isActive));
        });

        segments.forEach((segment, i) => {
          const isCurrent = i === index;

          segment.setAttribute("aria-current", String(isCurrent));
          segment.style.setProperty("--tmm-segment-fill", isCurrent ? "1" : "0");
        });

        prevButtons.forEach((b) => { b.disabled = index === 0; });
        nextButtons.forEach((b) => { b.disabled = index === slides.length - 1; });

        // Drives the Continue link and fades the spent next chevron out.
        // Swiping down was the only way on from here and nothing said so.
        section.classList.toggle("is-end", index === slides.length - 1);
      };

      const goToSlide = (next) => {
        const clamped = Math.max(0, Math.min(next, slides.length - 1));

        if (clamped === index) {
          return;
        }

        index = clamped;
        render();
      };

      jumpers.forEach((jumper) => {
        jumper.addEventListener("click", () => {
          goToSlide(Number.parseInt(jumper.dataset.introSlide || "0", 10));
        });
      });

      prevButtons.forEach((b) => b.addEventListener("click", () => goToSlide(index - 1)));
      nextButtons.forEach((b) => b.addEventListener("click", () => goToSlide(index + 1)));

      track.tabIndex = 0;
      track.setAttribute("role", "group");
      track.setAttribute("aria-roledescription", "carousel");
      track.addEventListener("keydown", (event) => {
        if (event.key !== "ArrowLeft" && event.key !== "ArrowRight") {
          return;
        }

        event.preventDefault();
        goToSlide(index + (event.key === "ArrowRight" ? 1 : -1));
      });

      // Swipe. The fade tracks the drag: opacity is driven by how far the
      // finger has travelled, so the two slides cross-dissolve under the
      // thumb rather than waiting for release. Direction is locked on the
      // first meaningful movement so a vertical drag scrolls the page.
      const COMMIT_RATIO = 0.28;
      let gesture = null;

      const trackWidth = () => track.getBoundingClientRect().width || 1;

      // Smoothstep, so the dissolve eases away from the start and into the
      // finish instead of tracking the finger linearly. A linear map is
      // what made it feel abrupt: opacity moved fastest exactly where the
      // eye is most sensitive to it, right at the endpoints.
      const ease = (t) => t * t * (3 - 2 * t);

      // Depth of the text drift, matching the resting offset in the CSS.
      const DRIFT = 7;
      const BLUR = 3;

      const paintSlide = (slide, opacity, direction) => {
        const away = 1 - opacity;

        slide.style.opacity = String(opacity);

        const header = slide.querySelector(".tmm-intro__header");

        if (!header) {
          return;
        }

        header.style.transform = `translateY(${away * DRIFT * direction}px)`;
        header.style.filter = away > 0.01 ? `blur(${(away * BLUR).toFixed(2)}px)` : "none";
      };

      const paint = (from, to, progress) => {
        const eased = ease(progress);

        segments.forEach((segment, i) => {
          if (i === from) {
            segment.style.setProperty("--tmm-segment-fill", String(1 - eased));
          } else if (i === to) {
            segment.style.setProperty("--tmm-segment-fill", String(eased));
          }
        });

        slides.forEach((slide, i) => {
          if (i === from) {
            // Outgoing lifts away; incoming rises into place.
            paintSlide(slide, 1 - eased, -1);
          } else if (i === to) {
            paintSlide(slide, eased, 1);
          } else {
            slide.style.opacity = "";
          }
        });
      };

      const clearPaint = () => {
        slides.forEach((slide) => {
          slide.style.opacity = "";

          const header = slide.querySelector(".tmm-intro__header");

          if (header) {
            header.style.transform = "";
            header.style.filter = "";
          }
        });
      };

      track.addEventListener(
        "pointerdown",
        (event) => {
          if (event.pointerType === "mouse" && event.button !== 0) {
            return;
          }

          gesture = { x: event.clientX, y: event.clientY, axis: null, to: null, progress: 0 };
        },
        { passive: true }
      );

      track.addEventListener(
        "pointermove",
        (event) => {
          if (!gesture) {
            return;
          }

          const dx = event.clientX - gesture.x;
          const dy = event.clientY - gesture.y;

          if (!gesture.axis && Math.abs(dx) + Math.abs(dy) > 8) {
            gesture.axis = Math.abs(dx) > Math.abs(dy) ? "x" : "y";

            if (gesture.axis === "x") {
              section.classList.add("is-dragging");
            }
          }

          if (gesture.axis === "y") {
            gesture = null;
            return;
          }

          if (gesture.axis !== "x" || reduceMotion.matches) {
            return;
          }

          const to = index + (dx < 0 ? 1 : -1);

          // At the ends there's nowhere to fade to, so resist instead.
          if (to < 0 || to > slides.length - 1) {
            gesture.to = null;
            gesture.progress = 0;
            clearPaint();
            slides[index].style.opacity = "1";
            return;
          }

          gesture.to = to;
          gesture.progress = Math.min(Math.abs(dx) / (trackWidth() * 0.5), 1);
          paint(index, to, gesture.progress);
        },
        { passive: true }
      );

      const endGesture = (event) => {
        if (!gesture) {
          return;
        }

        const { axis, to, progress } = gesture;
        const dx = event.clientX - gesture.x;

        gesture = null;
        section.classList.remove("is-dragging");
        clearPaint();

        if (axis !== "x") {
          return;
        }

        // Under reduced motion nothing was painted, so fall back to a
        // plain distance threshold.
        if (reduceMotion.matches) {
          if (Math.abs(dx) > 45) {
            goToSlide(index + (dx < 0 ? 1 : -1));
          }
          return;
        }

        if (to !== null && progress >= COMMIT_RATIO) {
          goToSlide(to);
        } else {
          render();
        }
      };

      track.addEventListener("pointerup", endGesture);
      track.addEventListener("pointercancel", () => {
        gesture = null;
        section.classList.remove("is-dragging");
        clearPaint();
        render();
      });
      track.addEventListener("dragstart", (event) => event.preventDefault());

      // Wheel / trackpad, to match the pricing cards — those are a native
      // horizontal scroller, so the browser gives them this for free.
      // Only horizontal intent moves the carousel: a plain vertical wheel
      // has to keep scrolling the page, or the section becomes a trap.
      // Shift+wheel counts as horizontal, which is what browsers do for
      // real scroll containers and is how a plain mouse gets there.
      const WHEEL_THRESHOLD = 40;
      let wheelTravel = 0;
      let wheelSpent = false;
      let wheelIdle = null;

      section.addEventListener(
        "wheel",
        (event) => {
          const horizontal =
            Math.abs(event.deltaX) > Math.abs(event.deltaY)
              ? event.deltaX
              : event.shiftKey
                ? event.deltaY
                : 0;

          if (!horizontal) {
            return;
          }

          // Claim the gesture so it doesn't also trigger the browser's
          // horizontal back/forward swipe.
          event.preventDefault();

          if (wheelIdle) {
            window.clearTimeout(wheelIdle);
          }

          // One slide per gesture: a flick emits a long tail of events,
          // and without this the carousel would run to the end.
          wheelIdle = window.setTimeout(() => {
            wheelTravel = 0;
            wheelSpent = false;
          }, 260);

          if (wheelSpent) {
            return;
          }

          wheelTravel += horizontal;

          if (Math.abs(wheelTravel) >= WHEEL_THRESHOLD) {
            goToSlide(index + (wheelTravel > 0 ? 1 : -1));
            wheelTravel = 0;
            wheelSpent = true;
          }
        },
        { passive: false }
      );

      // The imagery starts below the longest of the three subheadings and
      // runs to the bottom edge — giving it every pixel that's left means
      // object-fit: cover has the least possible to crop away. Anchored to
      // the tallest rather than each slide's own so the artwork doesn't
      // shift height while swiping. Measured with offsetHeight rather than
      // getBoundingClientRect so the drift transform on inactive slides
      // doesn't skew it.
      //
      // (This used to key off the dot row; the progress bar now sits at the
      // top of the section, so the subheading is the reference.)
      const positionMedia = () => {
        let tallest = 0;

        // Cleared first: in v2 the CSS floors every header at this same
        // value, so measuring without resetting would read back the last
        // result and the block could only ever grow.
        section.style.setProperty("--tmm-intro-header-h", "auto");

        slides.forEach((slide) => {
          const header = slide.querySelector(".tmm-intro__header");

          if (header) {
            tallest = Math.max(tallest, header.offsetHeight);
          }
        });

        if (tallest > 0) {
          const gap = 28;

          section.style.setProperty("--tmm-media-top", `${Math.round(tallest + gap)}px`);

          // v2 puts the nav row directly under the copy, so the row would
          // sit at a different height on each slide — the subheadings run to
          // three, four and five lines depending on the width. Flooring
          // every header at the tallest holds the row still at any width,
          // which no CSS reserve can do: the slides are stacked absolutely
          // and none of them knows how the others wrapped.
          section.style.setProperty("--tmm-intro-header-h", `${Math.ceil(tallest)}px`);
        }

        // v2 only: the imagery band. All three slides reserve the same
        // height, so the nav row cannot move between them, and each picture
        // is scaled inside it. The band is whatever is left once the header,
        // the row and the row's gap above it are paid for, capped at half the
        // section — which is what keeps the row clear of the artwork on a
        // short phone without any magic numbers per device.
        if (section.classList.contains("tmm-intro--v2") && tallest > 0) {
          const row = slides[0].querySelector(".tmm-intro__nav-row");
          const rowHeight = row ? row.offsetHeight : 0;
          const rowGap = row
            ? parseFloat(window.getComputedStyle(row).marginTop) || 0
            : 0;
          const CLEARANCE = 8;
          const available =
            track.clientHeight - tallest - rowHeight - rowGap - CLEARANCE;
          const band = Math.max(
            160,
            Math.min(Math.round(section.clientHeight * 0.5), Math.floor(available))
          );

          section.style.setProperty("--tmm-v2-band", `${band}px`);

        }

        // v2 on desktop: the masthead is placed into the left column with the
        // copy instead of sitting at the top of the section. It is a sibling
        // of the track, so on desktop the stylesheet takes it out of the flow
        // and the slide grid reserves a row for it; these two numbers are the
        // row's height and where that row ended up. Order matters — the row
        // has to exist before the header's position means anything, and
        // reading the rect between the two writes is what forces that.
        const brand = section.querySelector(".tmm-intro__masthead");
        const desktop = window.matchMedia("(min-width: 1024px)").matches;

        if (brand && desktop) {
          const BRAND_GAP = 24;
          const brandRow = brand.offsetHeight + BRAND_GAP;

          section.style.setProperty("--tmm-v2-brand-h", `${brandRow}px`);

          const header = slides[0].querySelector(".tmm-intro__header");

          if (header) {
            const top =
              header.getBoundingClientRect().top -
              section.getBoundingClientRect().top -
              brandRow;

            section.style.setProperty("--tmm-v2-brand-top", `${Math.round(top)}px`);
          }
        } else if (brand) {
          section.style.removeProperty("--tmm-v2-brand-h");
          section.style.removeProperty("--tmm-v2-brand-top");
        }

        // Where the track starts, so the chevrons can be centred on the
        // imagery rather than on the section — the two drift apart as the
        // section grows, which is what left them sitting low.
        section.style.setProperty("--tmm-track-top", `${Math.round(track.offsetTop)}px`);
      };

      let mediaFrame = null;
      const schedulePositionMedia = () => {
        if (mediaFrame) {
          window.cancelAnimationFrame(mediaFrame);
        }

        mediaFrame = window.requestAnimationFrame(positionMedia);
      };

      window.addEventListener("resize", schedulePositionMedia);

      if (typeof ResizeObserver === "function") {
        const observer = new ResizeObserver(schedulePositionMedia);

        slides.forEach((slide) => {
          const header = slide.querySelector(".tmm-intro__header");

          if (header) {
            observer.observe(header);
          }
        });
      }

      // Web fonts change the wrap, so re-measure once they've loaded.
      document.fonts?.ready?.then(schedulePositionMedia);

      reduceMotion.addEventListener?.("change", render);
      render();
      positionMedia();
    });
  };

  /* ------------------------------------------------------------------
     Host adaptation.

     The same bundle runs in Circle's Custom App Builder and in Site
     Builder, and the two wrap and chrome the page differently. Rather
     than hard-coding either, measure the host at runtime:

       1. Wrapper padding. The stylesheet resets .wb-p-5 by name, which
          only helps if that is the class the surface happens to use.
          Here we walk up from each of our sections and zero the padding
          on any wrapper that contains nothing but our own content — so
          it works whatever the utility class is called.
       2. Sticky/fixed top chrome. A full-viewport-height section sits
          partly underneath it. Measuring its depth lets the sections and
          the anchor scroll account for it.
     ------------------------------------------------------------------ */
  const HOST_SECTIONS = ".tmm-experience-splash, .tmm-intro, .tmm-join, .tmm-pricing";

  const wrapsOnlyOurContent = (element) => {
    const children = [...element.children];

    if (children.length === 0) {
      return false;
    }

    const everyChildIsOurs = children.every(
      (child) => child.matches(HOST_SECTIONS) || child.querySelector(HOST_SECTIONS)
    );

    const hasStrayText = [...element.childNodes].some(
      (node) => node.nodeType === 3 && node.textContent.trim().length > 0
    );

    return everyChildIsOurs && !hasStrayText;
  };

  const unpadHostWrappers = () => {
    const seen = new Set();

    document.querySelectorAll(HOST_SECTIONS).forEach((section) => {
      let element = section.parentElement;
      let depth = 0;

      while (element && element !== document.body && depth < 4) {
        if (!seen.has(element)) {
          seen.add(element);

          const styles = getComputedStyle(element);
          const padded =
            parseFloat(styles.paddingTop) ||
            parseFloat(styles.paddingRight) ||
            parseFloat(styles.paddingBottom) ||
            parseFloat(styles.paddingLeft);

          if (padded && wrapsOnlyOurContent(element)) {
            element.style.padding = "0px";
            element.dataset.tmmUnpadded = "true";
          }
        }

        element = element.parentElement;
        depth += 1;
      }
    });
  };

  // Probes what the host paints over a given edge of the viewport.
  const measureChromeAt = (edge) => {
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;
    const probeY = edge === "top" ? 2 : viewportHeight - 2;
    let depth = 0;

    const stack = document.elementsFromPoint?.(Math.round(viewportWidth / 2), probeY) || [];

    stack.forEach((element) => {
      if (element.matches?.(HOST_SECTIONS) || element.closest?.(HOST_SECTIONS)) {
        return;
      }

      const styles = getComputedStyle(element);

      if (styles.position !== "fixed" && styles.position !== "sticky") {
        return;
      }

      const rect = element.getBoundingClientRect();
      const spansWidth = rect.width >= viewportWidth * 0.6;
      const plausibleHeight = rect.height > 8 && rect.height < viewportHeight * 0.4;

      if (!spansWidth || !plausibleHeight) {
        return;
      }

      if (edge === "top" && rect.top <= 2) {
        depth = Math.max(depth, rect.bottom);
      }

      if (edge === "bottom" && rect.bottom >= viewportHeight - 2) {
        depth = Math.max(depth, viewportHeight - rect.top);
      }
    });

    return Math.round(depth);
  };

  // elementsFromPoint only finds chrome that is actually painted at the
  // probe point. Circle's tab bar can miss that — it may be pointer-events
  // free, or sit in a nested scroller so the window's own bottom edge isn't
  // where it lives. This sweeps the top of the DOM for anything pinned to
  // the bottom instead. Bounded to two levels below body, which is where
  // app shells put their furniture, so it stays cheap.
  const sweepForBottomChrome = () => {
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;
    const candidates = [];

    [...document.body.children].forEach((child) => {
      candidates.push(child, ...child.children);
    });

    let depth = 0;

    candidates.slice(0, 300).forEach((element) => {
      if (element.matches?.(HOST_SECTIONS) || element.querySelector?.(HOST_SECTIONS)) {
        return;
      }

      const styles = getComputedStyle(element);

      if (styles.position !== "fixed" && styles.position !== "sticky") {
        return;
      }

      if (styles.visibility === "hidden" || styles.display === "none") {
        return;
      }

      const rect = element.getBoundingClientRect();
      const pinnedToBottom = Math.abs(rect.bottom - viewportHeight) <= 2;
      const spansWidth = rect.width >= viewportWidth * 0.6;
      const plausibleHeight = rect.height > 8 && rect.height < viewportHeight * 0.4;

      if (pinnedToBottom && spansWidth && plausibleHeight) {
        depth = Math.max(depth, rect.height);
      }
    });

    return Math.round(depth);
  };

  // Circle's mobile-web tab bar only appears once the member starts
  // scrolling, so a single measurement at load finds nothing. We keep the
  // deepest value seen at this viewport size instead: the space is
  // reserved from the first time the bar shows, and the layout then stays
  // put rather than reflowing every time it hides and returns.
  let bottomChromeSeen = 0;
  let lastViewportKey = "";

  const adaptToHost = () => {
    unpadHostWrappers();

    const root = document.documentElement;
    const viewportKey = `${window.innerWidth}x${window.innerHeight}`;

    // Orientation or window change: start the bottom memo over.
    if (viewportKey !== lastViewportKey) {
      lastViewportKey = viewportKey;
      bottomChromeSeen = 0;
    }

    const top = measureChromeAt("top");
    bottomChromeSeen = Math.max(
      bottomChromeSeen,
      measureChromeAt("bottom"),
      sweepForBottomChrome()
    );

    // Only write these when we actually found chrome. These land as inline
    // styles, which outrank any stylesheet — so writing a measured 0 would
    // silently overwrite the value the page sets in its head snippet. In an
    // iframe (which is how Circle embeds us) detection always finds nothing,
    // and the author's value is the only one that's right.
    if (top > 0) {
      root.style.setProperty("--tmm-chrome-offset", `${top}px`);
    }

    if (bottomChromeSeen > 0) {
      root.style.setProperty("--tmm-chrome-bottom", `${bottomChromeSeen}px`);
    }

    // Only override the scroll offset when chrome was actually found,
    // so the stylesheet's default still applies if detection misses.
    if (top > 0) {
      root.style.setProperty("--tmm-scroll-offset", `${top + 8}px`);
    }

    // Those offsets move the copy down, which changes what the photograph
    // has room for.
    sizeJoinMedia();
  };

  let adaptFrame = null;
  let adaptTrailing = null;
  /* ------------------------------------------------------------------
     JOIN PANEL — the photograph's height, measured rather than assumed.

     The picture is bottom-anchored behind the copy and sized from the
     section's width (150cqw). That holds up in a browser and fails inside
     Circle's branded app, where the header bar eats real layout height and
     the safe-area inset pushes the copy down: the same width gives a
     photograph far too tall for what is left, and the raised arm crosses the
     sentence.

     So: measure the room between the bottom of the copy and the bottom of
     the picture, and divide by 0.896 — the top 10.4% of this cut-out is
     empty above the hand, measured off the asset's alpha channel, so that
     share of the box is invisible and can sit behind the copy. The result is
     the height at which the hand lands just under the sign-in line, whatever
     the host does to the section.

     No circularity: the copy is in the flow and the picture is absolute and
     bottom-anchored, so neither measurement moves when the height changes.
     ------------------------------------------------------------------ */
  const JOIN_MEDIA_HEADROOM = 0.104;
  const JOIN_MEDIA_GAP = 10;

  const sizeJoinMedia = (scope) => {
    const root = scope && scope.querySelectorAll ? scope : document;
    const panels = [...root.querySelectorAll(".tmm-join--v2")];

    if (root !== document && root.matches && root.matches(".tmm-join--v2")) {
      panels.push(root);
    }

    panels.forEach((panel) => {
      const media = panel.querySelector(".tmm-join__media");
      const header = panel.querySelector(".tmm-join__header");

      if (!media || !header) {
        return;
      }

      // Desktop lays this out in a column with its own height; the band is a
      // phone correction and must not reach it.
      if (window.matchMedia("(min-width: 1024px)").matches) {
        panel.style.removeProperty("--tmm-v2-join-media-h");
        return;
      }

      const panelRect = panel.getBoundingClientRect();
      const mediaRect = media.getBoundingClientRect();
      const copyBottom = header.getBoundingClientRect().bottom - panelRect.top;
      const mediaBottom = mediaRect.bottom - panelRect.top;
      const room = mediaBottom - copyBottom - JOIN_MEDIA_GAP;

      if (room <= 0) {
        return;
      }

      const widthDriven = panel.clientWidth * 1.5;
      const fits = room / (1 - JOIN_MEDIA_HEADROOM);
      const height = Math.max(200, Math.min(widthDriven, fits));

      panel.style.setProperty("--tmm-v2-join-media-h", `${Math.round(height)}px`);
    });
  };

  let joinFrame = null;
  const scheduleJoinMedia = () => {
    if (joinFrame) {
      window.cancelAnimationFrame(joinFrame);
    }

    joinFrame = window.requestAnimationFrame(() => sizeJoinMedia());
  };

  window.addEventListener("resize", scheduleJoinMedia);
  document.fonts?.ready?.then(() => sizeJoinMedia());

  const scheduleAdapt = () => {
    if (adaptFrame) {
      window.cancelAnimationFrame(adaptFrame);
    }

    adaptFrame = window.requestAnimationFrame(adaptToHost);

    // The tab bar slides in over ~200ms, so a measurement taken on the
    // scroll event itself catches it mid-transition, or not at all.
    // Measure again once the host's own animation has settled.
    if (adaptTrailing) {
      window.clearTimeout(adaptTrailing);
    }

    adaptTrailing = window.setTimeout(adaptToHost, 320);
  };

  window.addEventListener("resize", scheduleAdapt);
  window.addEventListener("scroll", scheduleAdapt, { passive: true });

  if (document.readyState === "loading") {
    document.addEventListener(
      "DOMContentLoaded",
      () => {
        adaptToHost();
        completeExperienceSplash();
        setupIntroCarousels();
        setupWelcomeSections();
        setupPricingSections();
        setupPhotoDecks();
        sizeJoinMedia();
      },
      { once: true }
    );
  } else {
    adaptToHost();
    completeExperienceSplash();
    setupIntroCarousels();
    setupWelcomeSections();
    setupPricingSections();
    setupPhotoDecks();
    sizeJoinMedia();
  }

  new MutationObserver((mutations) => {
    mutations.forEach((mutation) => {
      mutation.addedNodes.forEach((node) => {
        if (node.nodeType === 1) {
          scheduleAdapt();
          completeExperienceSplash(node);
          setupIntroCarousels(node);
          setupWelcomeSections(node);
          setupPricingSections(node);
          setupPhotoDecks(node);
          sizeJoinMedia(node);
        }
      });
    });
  }).observe(document.documentElement, { childList: true, subtree: true });
})();
