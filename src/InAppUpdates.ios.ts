// @ts-expect-error
import Siren from 'react-native-siren';

import { compareVersions } from './utils';
import InAppUpdatesBase from './InAppUpdatesBase';
import type {
  CheckOptions,
  IosPerformCheckResponse,
  IosStartUpdateOptions,
  IosNeedsUpdateResponse,
} from './types';

const noop = () => {};

export default class InAppUpdates extends InAppUpdatesBase {
  public checkNeedsUpdate(
    checkOptions: CheckOptions
  ): Promise<IosNeedsUpdateResponse> {
    const { curVersion, toSemverConverter, customVersionComparator } =
      checkOptions || {};
    if (!curVersion) {
      this.throwError(
        'You have to include at least the curVersion to the options passed in checkNeedsUpdate',
        'checkNeedsUpdate'
      );
    }
    this.debugLog('Checking store version (iOS)');
    return Siren.performCheck()
      .then((checkResponse: IosPerformCheckResponse) => {
        this.debugLog(
          `Received response from app store: ${JSON.stringify(checkResponse)}`
        );
        const { version } = checkResponse || {};

        if (version != null) {
          let newAppV = `${version}`;
          if (toSemverConverter) {
            newAppV = toSemverConverter(version);
            this.debugLog(
              `Used custom semver, and converted result from store (${version}) to ${newAppV}`
            );
            if (!newAppV) {
              this.throwError(
                `Couldnt convert ${version} using your custom semver converter`,
                'checkNeedsUpdate'
              );
            }
          }
          const vCompRes = customVersionComparator
            ? customVersionComparator(newAppV, curVersion)
            : compareVersions(newAppV, curVersion);

          if (vCompRes > 0) {
            this.debugLog(
              `Compared cur version (${curVersion}) with store version (${newAppV}). The store version is higher!`
            );
            // app store version is higher than the current version
            return {
              shouldUpdate: true,
              storeVersion: newAppV,
              other: { ...checkResponse },
            };
          }
          this.debugLog(
            `Compared cur version (${curVersion}) with store version (${newAppV}). The current version is higher!`
          );
          return {
            shouldUpdate: false,
            storeVersion: newAppV,
            reason: `current version (${curVersion}) is already later than the latest store version (${newAppV}${
              toSemverConverter ? ` - originated from ${version}` : ''
            })`,
            other: { ...checkResponse },
          };
        }
        this.debugLog('Failed to fetch a store version');
        return {
          shouldUpdate: false,
          reason: 'Couldn\t fetch the latest version',
          other: { ...checkResponse },
        };
      })
      .catch((err: any) => {
        this.debugLog(err);
        this.throwError(err, 'checkNeedsUpdate');
      });
  }

  startUpdate(updateOptions: IosStartUpdateOptions): Promise<void> {
    return Promise.resolve(Siren.promptUser(updateOptions));
  }

  installUpdate = noop;
  addStatusUpdateListener = noop;
  removeStatusUpdateListener = noop;
  addIntentSelectionListener = noop;
  removeIntentSelectionListener = noop;
}
