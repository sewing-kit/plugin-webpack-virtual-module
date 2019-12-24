import {createProjectPlugin, WebApp, Service, Task} from '@sewing-kit/plugins';
import {} from '@sewing-kit/plugin-webpack';

export type VirtualModules = string | {[key: string]: string};

export interface Options {
  asEntry?: boolean;
  include?: (Task.Dev | Task.Build)[];
}

export interface VirtualModuleGetterOptions {
  readonly project:
    | import('@sewing-kit/model').WebApp
    | import('@sewing-kit/model').Service;
  readonly api: import('@sewing-kit/plugins').PluginApi;
}

const PLUGIN = 'WebpackVirtualModules';

export function useVirtualModules(
  moduleGetter:
    | VirtualModules
    | ((
        options: VirtualModuleGetterOptions,
      ) => VirtualModules | Promise<VirtualModules>),
  {asEntry = false, include = [Task.Build, Task.Dev]}: Options = {},
) {
  return createProjectPlugin<WebApp | Service>(
    PLUGIN,
    ({api, project, tasks: {build, dev}}) => {
      if (include.includes(Task.Build)) {
        build.hook(({hooks}) => {
          hooks.configure.hook(configure);
        });
      }

      if (include.includes(Task.Dev)) {
        dev.hook(({hooks}) => {
          hooks.configure.hook(configure);
        });
      }

      async function configure(
        configure: Partial<
          import('@sewing-kit/hooks').DevWebAppConfigurationHooks &
            import('@sewing-kit/hooks').DevServiceConfigurationHooks &
            import('@sewing-kit/hooks').BuildWebAppConfigurationHooks &
            import('@sewing-kit/hooks').BuildServiceConfigurationHooks
        >,
      ) {
        const rawVirtualModules =
          typeof moduleGetter === 'function'
            ? await moduleGetter({project, api})
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

        configure.webpackPlugins?.hook(async (plugins) => [
          ...plugins,
          // eslint-disable-next-line babel/new-cap
          new (await import('webpack-virtual-modules')).default(virtualModules),
        ]);

        if (asEntry) {
          configure.webpackEntries?.hook(() => [
            Object.keys(virtualModules)[0],
          ]);
        }
      }
    },
  );
}
