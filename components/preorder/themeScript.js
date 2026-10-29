// Shared by the server page (which inlines the script) and the client.
export const THEME_KEY = "epocheye-preorder-theme";

/** Runs before first paint: the stored choice, else dark, onto <html data-pa-theme>. */
export const THEME_SCRIPT = `try{var t=localStorage.getItem("${THEME_KEY}");if(t!=="light"&&t!=="dark")t="dark";document.documentElement.dataset.paTheme=t}catch(e){document.documentElement.dataset.paTheme="dark"}`;
