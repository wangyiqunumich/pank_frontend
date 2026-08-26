module.exports = function addNamedReactComponentExport(source) {
  return source.replace(
    /export default ([A-Za-z_$][\w$]*);?\s*$/,
    'export { $1 as ReactComponent };\nexport default $1;\n',
  );
};
