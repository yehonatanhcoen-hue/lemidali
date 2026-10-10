// Plain module (no "use client") so the server layout can inline the script.

export const APPEARANCE_KEY = "lemidali:appearance";
export const LEGACY_THEME_KEY = "lemidali:theme"; // old light/dark toggle

/**
 * Runs in <head> before paint (no flash of the wrong theme). Kept dependency-free and
 * in sync with read()/apply() in appearance.tsx.
 */
export const appearanceScript = `try{var d=document.documentElement,a={};try{a=JSON.parse(localStorage.getItem("${APPEARANCE_KEY}")||"{}")||{}}catch(e){}var l=localStorage.getItem("${LEGACY_THEME_KEY}");var t=["energy","clear","paper","night","minimal"].indexOf(a.theme)>=0?a.theme:"energy";var m=a.mode||(l==="dark"||l==="light"?l:"auto");var s=a.size||"md";var k=m==="dark"||(m==="auto"&&matchMedia("(prefers-color-scheme: dark)").matches);d.setAttribute("data-theme",t);d.setAttribute("data-size",s);d.classList.toggle("dark",k)}catch(e){}`;

