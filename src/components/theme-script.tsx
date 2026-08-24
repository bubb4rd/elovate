export function ThemeScript() {
  const script = `
    (function () {
      try {
        var stored = localStorage.getItem("t250-theme");
        var dark;
        if (stored === "light") dark = false;
        else if (stored === "dark") dark = true;
        else dark = !window.matchMedia("(prefers-color-scheme: light)").matches;
        document.documentElement.classList.toggle("dark", dark);
      } catch (e) {
        document.documentElement.classList.add("dark");
      }
    })();
  `;
  return <script dangerouslySetInnerHTML={{ __html: script }} />;
}
