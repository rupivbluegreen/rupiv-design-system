// Type declaration for CSS Modules. The bundler (Next.js or Vite) resolves the files; TypeScript only needs the shape.
// Plain `import "./x.css"` needs no declaration (noUncheckedSideEffectImports is off).

declare module "*.module.css" {
  const classes: { readonly [className: string]: string };
  export default classes;
}
