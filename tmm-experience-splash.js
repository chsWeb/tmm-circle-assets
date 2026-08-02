(() => {
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

  const formatPrice = (value) => {
    return value === "0" ? "$0" : `$${value}`;
  };

  const updatePricingSection = (section, billingCycle) => {
    section.dataset.billing = billingCycle;

    section.querySelectorAll(".tmm-pricing__toggle-button").forEach((button) => {
      button.setAttribute("aria-pressed", String(button.dataset.billingToggle === billingCycle));
    });

    section.querySelectorAll(".tmm-pricing-card").forEach((card) => {
      const price = card.querySelector(".tmm-pricing-card__price");
      const period = card.querySelector(".tmm-pricing-card__period");
      const priceValue = card.dataset[`${billingCycle}Price`];
      const periodValue = card.dataset[`${billingCycle}Period`];

      if (!price || !period || !priceValue || !periodValue) {
        return;
      }

      price.classList.add("is-changing");

      window.setTimeout(() => {
        price.textContent = formatPrice(priceValue);
        period.textContent = periodValue;
        price.classList.remove("is-changing");
      }, 120);
    });
  };

  const setupPricingSections = (root = document) => {
    root.querySelectorAll(".tmm-pricing").forEach((section) => {
      if (handledPricingSections.has(section)) {
        return;
      }

      handledPricingSections.add(section);
      updatePricingSection(section, section.dataset.billing || "quarterly");

      section.querySelectorAll(".tmm-pricing__toggle-button").forEach((button) => {
        button.addEventListener("click", () => {
          updatePricingSection(section, button.dataset.billingToggle || "quarterly");
        });
      });

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

      section.querySelectorAll('a[href^="#"]').forEach((link) => {
        link.addEventListener("click", (event) => {
          const target = document.querySelector(link.getAttribute("href"));

          if (!target) {
            return;
          }

          event.preventDefault();

          if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
            target.scrollIntoView({ behavior: "auto", block: "start" });
            window.scrollBy(0, -getScrollOffset());
            return;
          }

          scrollToTarget(target, 950, getScrollOffset());
        });
      });
    });
  };

  const handledIntroCarousels = new WeakSet();

  const setupIntroCarousels = (root = document) => {
    root.querySelectorAll(".tmm-intro, .tmm-join").forEach((section) => {
      if (handledIntroCarousels.has(section)) {
        return;
      }

      handledIntroCarousels.add(section);

      section.querySelectorAll('a[href^="#"]').forEach((link) => {
        link.addEventListener("click", (event) => {
          const target = document.querySelector(link.getAttribute("href"));

          if (!target) {
            return;
          }

          event.preventDefault();

          if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
            target.scrollIntoView({ behavior: "auto", block: "start" });
            window.scrollBy(0, -getScrollOffset());
            return;
          }

          scrollToTarget(target, 950, getScrollOffset());
        });
      });

      const track = section.querySelector(".tmm-intro__track");
      const slides = [...section.querySelectorAll(".tmm-intro__slide")];
      const segments = [...section.querySelectorAll(".tmm-intro__segment")];
      const prevButton = section.querySelector(".tmm-intro__nav--prev");
      const nextButton = section.querySelector(".tmm-intro__nav--next");

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

        if (prevButton) {
          prevButton.disabled = index === 0;
        }

        if (nextButton) {
          nextButton.disabled = index === slides.length - 1;
        }
      };

      const goToSlide = (next) => {
        const clamped = Math.max(0, Math.min(next, slides.length - 1));

        if (clamped === index) {
          return;
        }

        index = clamped;
        render();
      };

      segments.forEach((segment) => {
        segment.addEventListener("click", () => {
          goToSlide(Number.parseInt(segment.dataset.introSlide || "0", 10));
        });
      });

      prevButton?.addEventListener("click", () => goToSlide(index - 1));
      nextButton?.addEventListener("click", () => goToSlide(index + 1));

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

        slides.forEach((slide) => {
          const header = slide.querySelector(".tmm-intro__header");

          if (header) {
            tallest = Math.max(tallest, header.offsetHeight);
          }
        });

        if (tallest > 0) {
          const gap = 28;

          section.style.setProperty("--tmm-media-top", `${Math.round(tallest + gap)}px`);
        }
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
    bottomChromeSeen = Math.max(bottomChromeSeen, measureChromeAt("bottom"));

    root.style.setProperty("--tmm-chrome-offset", `${top}px`);
    root.style.setProperty("--tmm-chrome-bottom", `${bottomChromeSeen}px`);

    // Only override the scroll offset when chrome was actually found,
    // so the stylesheet's default still applies if detection misses.
    if (top > 0) {
      root.style.setProperty("--tmm-scroll-offset", `${top + 8}px`);
    }
  };

  let adaptFrame = null;
  let adaptTrailing = null;
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
        }
      });
    });
  }).observe(document.documentElement, { childList: true, subtree: true });
})();
