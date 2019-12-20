import {createPackage, Runtime} from '@sewing-kit/config';
import {createPackageFlexibleOutputsPlugin} from '@sewing-kit/plugin-package-flexible-outputs';
import {
  quiltWorkspacePlugin,
  quiltPackagePlugin,
} from '@quilted/sewing-kit-plugins';

export default createPackage((pkg) => {
  pkg.runtime(Runtime.Node);
  pkg.entry({root: './src/index'});
  pkg.plugins(
    quiltWorkspacePlugin,
    quiltPackagePlugin,
    createPackageFlexibleOutputsPlugin({
      binaries: false,
      commonjs: true,
      esmodules: false,
      esnext: false,
      node: false,
      typescript: true,
    }),
  );
});
