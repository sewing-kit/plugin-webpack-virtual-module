import {createProjectPlugin} from '@sewing-kit/plugins';
import {} from '@sewing-kit/plugin-webpack';

export type VirtualModules = string | {[key: string]: string};

export interface Options {
  asEntry?: boolean;
}

const PLUGIN = 'WebpackVirtualModules';

export function useVirtualModules(
  moduleGetter:
    | VirtualModules
    | (() => VirtualModules | Promise<VirtualModules>),
  {asEntry = false}: Options = {},
) {
  return createProjectPlugin({
    id: PLUGIN,
    run({build, dev}, api) {
      build.tap(PLUGIN, ({hooks}) => {
        hooks.service.tapPromise(PLUGIN, configure);
        hooks.webApp.tapPromise(PLUGIN, configure);
      });

      dev.tap(PLUGIN, ({hooks}) => {
        hooks.service.tapPromise(PLUGIN, configure);
        hooks.webApp.tapPromise(PLUGIN, configure);
      });

      async function configure(
        details:
          | {
              service: import('@sewing-kit/model').Service;
              hooks:
                | import('@sewing-kit/hooks').BuildServiceHooks
                | import('@sewing-kit/hooks').DevServiceHooks;
            }
          | {
              webApp: import('@sewing-kit/model').WebApp;
              hooks:
                | import('@sewing-kit/hooks').BuildWebAppHooks
                | import('@sewing-kit/hooks').DevWebAppHooks;
            },
      ) {
        const project = 'service' in details ? details.service : details.webApp;

        const rawVirtualModules =
          typeof moduleGetter === 'function'
            ? await moduleGetter()
            : moduleGetter;
        const virtualModules =
          typeof rawVirtualModules === 'string'
            ? {
                [api.tmpPath(
                  'webpack-virtual-modules',
                  `${project.name}.js`,
                )]: rawVirtualModules,
              }
            : rawVirtualModules;

        details.hooks.configure.tap(PLUGIN, (configure) => {
          configure.webpackPlugins?.tapPromise(PLUGIN, async (plugins) => [
            ...plugins,
            // eslint-disable-next-line babel/new-cap
            new (await import('webpack-virtual-modules')).default(
              virtualModules,
            ),
          ]);

          if (asEntry) {
            configure.webpackEntries?.tap(PLUGIN, () => [
              Object.keys(virtualModules)[0],
            ]);
          }
        });
      }
    },
  });
}
