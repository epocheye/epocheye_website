// Shared by the server page (which inlines the script) and the client.
export const THEME_KEY = "epocheye-preorder-theme";

/** Runs before first paint: the stored choice, else the system's, onto <html data-pa-theme>. */
export const THEME_SCRIPT = `try{var t=localStorage.getItem("${THEME_KEY}");if(t!=="light"&&t!=="dark")t=matchMedia("(prefers-color-scheme: dark)").matches?"dark":"light";document.documentElement.dataset.paTheme=t}catch(e){}`;
