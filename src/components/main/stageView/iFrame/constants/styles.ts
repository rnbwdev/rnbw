export const styles = `
[data-theme=light],
html {
  --color-rnbwdev-rainbow-element-background: #ddd;
  --color-rnbwdev-rainbow-element-foreground: #333;
}
[data-theme=dark] {
  --color-rnbwdev-rainbow-element-background: #333;
  --color-rnbwdev-rainbow-element-foreground: #ddd;
}

/* Common style for hover state on non-text elements */
[rnbwdev-rnbw-element-hover]:not([rnbwdev-rnbw-element-select]):not(h1):not(h2):not(h3):not(h4):not(h5):not(h6):not(p) {
  outline: 2px solid var(--color-rnbwdev-rainbow-element-foreground);
  outline-offset: -1px;
}

/* Specific style for text-type elements when hovered and not selected */
h1[rnbwdev-rnbw-element-hover]:not([rnbwdev-rnbw-element-select]),
h2[rnbwdev-rnbw-element-hover]:not([rnbwdev-rnbw-element-select]),
h3[rnbwdev-rnbw-element-hover]:not([rnbwdev-rnbw-element-select]),
h4[rnbwdev-rnbw-element-hover]:not([rnbwdev-rnbw-element-select]),
h5[rnbwdev-rnbw-element-hover]:not([rnbwdev-rnbw-element-select]),
h6[rnbwdev-rnbw-element-hover]:not([rnbwdev-rnbw-element-select]),
p[rnbwdev-rnbw-element-hover]:not([rnbwdev-rnbw-element-select]) {
  text-decoration: underline;
  text-decoration-color: var(--color-rnbwdev-rainbow-element-foreground);
  text-decoration-thickness: 2px; /* Increased to 2px when hovered and not selected */
  outline: none;
}

/* Style for selected elements */
[rnbwdev-rnbw-element-select] {
  outline: 1px solid var(--color-rnbwdev-rainbow-element-foreground);
  outline-offset: -1px;
}

/* Specific style for selected text-type elements */
h1[rnbwdev-rnbw-element-select],
h2[rnbwdev-rnbw-element-select],
h3[rnbwdev-rnbw-element-select],
h4[rnbwdev-rnbw-element-select],
h5[rnbwdev-rnbw-element-select],
h6[rnbwdev-rnbw-element-select],
p[rnbwdev-rnbw-element-select] {
  text-decoration: underline;
  text-decoration-color: var(--color-rnbwdev-rainbow-element-foreground);
  text-decoration-thickness: 1px;
}


[data-rnbwdev-rnbw-node]:empty:not(svg-icon):not(.icon-xs):not(.icon-s):not(.icon-m):not(.icon-l):not(.icon-xl):not([style*="width"]):not([style*="height"]):not(.direction-column):not(.direction-row):not(hr, label, span, br) {
  min-width: 80px;
  min-height: 80px;
}

body {
  min-height: 100vh;
  margin:0px;
}

body > * {
  -webkit-user-select: none; /* Safari */
  -ms-user-select: none; /* IE 10 and IE 11 */
  user-select: none; /* Standard syntax */
}
`;
