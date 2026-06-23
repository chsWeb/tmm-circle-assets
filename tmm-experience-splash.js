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
      updatePricingSection(section, section.dataset.billing || "monthly");

      section.querySelectorAll(".tmm-pricing__toggle-button").forEach((button) => {
        button.addEventListener("click", () => {
          updatePricingSection(section, button.dataset.billingToggle || "monthly");
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

      const cards = [...deck.querySelectorAll("[data-tmm-deck-card]")];
      const cardCount = cards.length;
      const dotsContainer = deck.parentElement?.querySelector("[data-tmm-deck-dots]");
      const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
      const restStates = [
        { x: 0, y: 0, rotate: -2, scale: 1, opacity: 1 },
        { x: -22, y: 8, rotate: -7, scale: 0.965, opacity: 0.97 },
        { x: 24, y: 14, rotate: 7, scale: 0.935, opacity: 0.93 },
        { x: -34, y: 24, rotate: -11, scale: 0.905, opacity: 0.89 },
        { x: 34, y: 30, rotate: 10, scale: 0.875, opacity: 0.85 },
        { x: 0, y: 38, rotate: 2, scale: 0.845, opacity: 0.8 },
      ];
      let isAnimating = false;
      let activePointer = null;
      let dots = [];

      cards.forEach((card, index) => {
        card.dataset.deckIndex = String(index);
      });

      const getRestState = (depth) => {
        return restStates[Math.min(depth, restStates.length - 1)];
      };

      const getRestTransform = (depth) => {
        const state = getRestState(depth);

        return `translate3d(${state.x}px, ${state.y}px, 0) rotate(${state.rotate}deg) scale(${state.scale})`;
      };

      const applyCardState = (card, depth, animate = true) => {
        const state = getRestState(depth);

        card.style.transition = animate ? "" : "none";
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

      const reorderForTarget = (outgoingCard, targetCard = null) => {
        if (targetCard) {
          const middleCards = cards.filter((item) => item !== targetCard && item !== outgoingCard);

          cards.splice(0, cards.length, targetCard, ...middleCards, outgoingCard);

          return;
        }

        cards.push(cards.shift());
      };

      const dismissCard = (card, direction, releaseY = 0, targetCard = null) => {
        if (isAnimating || cards[0] !== card) {
          return;
        }

        if (reducedMotion.matches) {
          reorderForTarget(card, targetCard);
          renderDeck(false);
          cards[0]?.focus({ preventScroll: true });
          return;
        }

        isAnimating = true;
        const deckWidth = deck.getBoundingClientRect().width;
        const sideX = direction * Math.min(deckWidth * 0.46, 190);
        const sideY = Math.max(-28, Math.min(releaseY * 0.18 + 22, 58));

        reorderForTarget(card, targetCard);
        cards.forEach((deckCard, depth) => {
          if (deckCard !== card) {
            applyCardState(deckCard, depth, true);
          }
        });
        updateDots();

        card.style.zIndex = String(cardCount + 2);
        card.style.transition =
          "transform 440ms cubic-bezier(0.32, 0.72, 0, 1), opacity 320ms cubic-bezier(0.32, 0.72, 0, 1)";
        card.style.transform =
          `translate3d(${sideX}px, ${sideY}px, 0) rotate(${direction * 14}deg) scale(0.92)`;
        card.style.opacity = "0.72";

        window.setTimeout(() => {
          const depth = cards.indexOf(card);
          const state = getRestState(depth);

          card.style.zIndex = String(cardCount - depth);
          card.style.transition =
            "transform 620ms cubic-bezier(0.16, 1, 0.3, 1), opacity 520ms cubic-bezier(0.16, 1, 0.3, 1)";
          card.style.transform = getRestTransform(depth);
          card.style.opacity = String(state.opacity);

          window.setTimeout(() => {
            card.tabIndex = -1;
            card.setAttribute("aria-hidden", "true");
            isAnimating = false;
          }, 630);
        }, 430);
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

            dismissCard(cards[0], direction, 0, card);
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

          activePointer.velocityX = (event.clientX - activePointer.lastX) / elapsed;
          activePointer.lastX = event.clientX;
          activePointer.lastTime = event.timeStamp;

          card.style.transform =
            `translate3d(${dx}px, ${dy * 0.55}px, 0) rotate(${-2 + dx / 18}deg) scale(1.015)`;
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
            dismissCard(card, direction, dy);
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
          const direction = event.key === "ArrowLeft" ? -1 : 1;

          dismissCard(card, direction);
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

  if (document.readyState === "loading") {
    document.addEventListener(
      "DOMContentLoaded",
      () => {
        completeExperienceSplash();
        setupWelcomeSections();
        setupPricingSections();
        setupPhotoDecks();
      },
      { once: true }
    );
  } else {
    completeExperienceSplash();
    setupWelcomeSections();
    setupPricingSections();
    setupPhotoDecks();
  }

  new MutationObserver((mutations) => {
    mutations.forEach((mutation) => {
      mutation.addedNodes.forEach((node) => {
        if (node.nodeType === 1) {
          completeExperienceSplash(node);
          setupWelcomeSections(node);
          setupPricingSections(node);
          setupPhotoDecks(node);
        }
      });
    });
  }).observe(document.documentElement, { childList: true, subtree: true });
})();
