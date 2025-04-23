const path = require('path');

module.exports = function override(config, env) {
  // Add the node_modules path to the module resolution
  config.resolve = {
    ...config.resolve,
    modules: [path.resolve(__dirname, 'node_modules'), 'node_modules'],
    fallback: {
      ...config.resolve.fallback,
      path: require.resolve('path-browserify'),
    },
  };
  
  // Add the node_modules path to the include paths
  if (config.module && config.module.rules) {
    config.module.rules.forEach(rule => {
      if (rule.oneOf) {
        rule.oneOf.forEach(oneOfRule => {
          if (oneOfRule.include) {
            oneOfRule.include = [oneOfRule.include, '/app/node_modules'];
          }
        });
      }
    });
  }
  
  return config;
}; 