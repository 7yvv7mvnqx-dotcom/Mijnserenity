/* MijnSerenity Cloud 6.0 — navigatie automatisch verbergen */
(() => {
  const HIDE_AFTER = 4000;
  let timer;

  const showNav = () => {
    document.body.classList.remove("serenity-nav-hidden");
    clearTimeout(timer);
    timer = setTimeout(() => {
      document.body.classList.add("serenity-nav-hidden");
    }, HIDE_AFTER);
  };

  const activityEvents = [
    "pointerdown",
    "pointermove",
    "touchstart",
    "mousemove",
    "keydown",
    "wheel",
    "scroll"
  ];

  activityEvents.forEach((eventName) => {
    window.addEventListener(eventName, showNav, {
      passive: true,
      capture: true
    });
  });

  document.addEventListener("visibilitychange", () => {
    if (!document.hidden) showNav();
  });

  window.addEventListener("load", showNav);
  showNav();
})();