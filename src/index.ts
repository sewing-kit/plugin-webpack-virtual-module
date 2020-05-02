import {
  createProjectPlugin,
  WebApp,
  Service,
  Task,
  ProjectPluginContext,
} from '@sewing-kit/plugins';
import {} from '@sewing-kit/plugin-webpack';

export type VirtualModules = string | {[key: string]: string};

export interface Options {
  asEntry?: boolean;
  include?: (Task.Dev | Task.Build)[];
}

export interface VirtualModuleGetterOptions<
  Type extends WebApp | Service = WebApp | Service
> extends Pick<ProjectPluginContext<Type>, 'project' | 'api'> {}

const PLUGIN = 'WebpackVirtualModules';

export function virtualModules<
  Type extends WebApp | Service = WebApp | Service
>(
  moduleGetter:
    | VirtualModules
    | ((
        options: VirtualModuleGetterOptions<Type>,
      ) => VirtualModules | Promise<VirtualModules>),
  {asEntry = false, include = [Task.Build, Task.Dev]}: Options = {},
) {
  return createProjectPlugin<Type>(
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
        configure:
          | import('@sewing-kit/hooks').DevWebAppConfigurationHooks
          | import('@sewing-kit/hooks').DevServiceConfigurationHooks
          | import('@sewing-kit/hooks').BuildWebAppConfigurationHooks
          | import('@sewing-kit/hooks').BuildServiceConfigurationHooks,
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

        configure.webpackPlugins?.hook(async (plugins) => {
          const {default: WebpackVirtualModules} = await import(
            'webpack-virtual-modules'
          );

          return [...plugins, new WebpackVirtualModules(virtualModules)];
        });

        if (asEntry) {
          configure.webpackEntries?.hook(() => [
            Object.keys(virtualModules)[0],
          ]);
        }
      }
    },
  );
}
