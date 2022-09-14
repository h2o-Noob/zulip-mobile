/* @flow strict-local */
import React, { PureComponent } from 'react';
import type { Node } from 'react';
import { Keyboard, View } from 'react-native';

import type { RouteProp } from '../react-navigation';
import type { AppNavigationProp } from '../nav/AppNavigator';
import type { ApiResponseServerSettings } from '../api/settings/getServerSettings';
import ErrorMsg from '../common/ErrorMsg';
import ZulipTextIntl from '../common/ZulipTextIntl';
import SmartUrlInput from '../common/SmartUrlInput';
import Screen from '../common/Screen';
import ZulipButton from '../common/ZulipButton';
import WebLink from '../common/WebLink';
import * as api from '../api';
import ZulipText from '../common/ZulipText';
import { tryParseUrl } from '../utils/url';

type Props = $ReadOnly<{|
  navigation: AppNavigationProp<'realm-input'>,
  route: RouteProp<'realm-input', {| initial: boolean | void |}>,
|}>;

type State = {|
  realmInputValue: string,
  error: string | null,
  progress: boolean,
|};

const urlFromInputValue = (realmInputValue: string): URL | void => {
  const withScheme = /^https?:\/\//.test(realmInputValue)
    ? realmInputValue
    : `https://${realmInputValue}`;

  return tryParseUrl(withScheme);
};

export default class RealmInputScreen extends PureComponent<Props, State> {
  state: State = {
    progress: false,
    realmInputValue: '',
    error: null,
  };

  tryRealm: () => Promise<void> = async () => {
    const { realmInputValue } = this.state;

    const parsedRealm = urlFromInputValue(realmInputValue);
    if (!parsedRealm) {
      this.setState({ error: 'Please enter a valid URL' });
      return;
    }
    if (parsedRealm.username !== '') {
      this.setState({ error: 'Please enter the server URL, not your email' });
      return;
    }

    this.setState({
      progress: true,
      error: null,
    });
    try {
      const serverSettings: ApiResponseServerSettings = await api.getServerSettings(parsedRealm);
      this.props.navigation.push('auth', { serverSettings });
      Keyboard.dismiss();
    } catch (errorIllTyped) {
      const err: mixed = errorIllTyped; // https://github.com/facebook/flow/issues/2470
      this.setState({ error: 'Cannot connect to server' });
      /* eslint-disable no-console */
      console.warn('RealmInputScreen: failed to connect to server:', err);
      // $FlowFixMe[incompatible-cast]: assuming caught exception was Error
      console.warn((err: Error).stack);
    } finally {
      this.setState({ progress: false });
    }
  };

  handleRealmChange: string => void = value => this.setState({ realmInputValue: value });

  render(): Node {
    const { navigation } = this.props;
    const { progress, error, realmInputValue } = this.state;

    const styles = {
      input: { marginTop: 16, marginBottom: 8 },
      hintText: { paddingLeft: 2, fontSize: 12 },
      button: { marginTop: 8 },
      newOrgText: { marginTop: 20, textAlign: 'center' }
    };

    return (
      <Screen
        title="Welcome"
        canGoBack={!this.props.route.params.initial}
        padding
        centerContent
        keyboardShouldPersistTaps="always"
        shouldShowLoadingBanner={false}
      >
        <ZulipTextIntl text="Enter your Zulip server URL:" />
        <SmartUrlInput
          style={styles.input}
          navigation={navigation}
          onChangeText={this.handleRealmChange}
          onSubmitEditing={this.tryRealm}
          enablesReturnKeyAutomatically
        />
        {error !== null ? (
          <ErrorMsg error={error} />
        ) : (
          <ZulipTextIntl text="e.g. zulip.example.com" style={styles.hintText} />
        )}
        <ZulipButton
          style={styles.button}
          text="Enter"
          progress={progress}
          onPress={this.tryRealm}
          disabled={urlFromInputValue(realmInputValue) === undefined}
        />
        <View style={styles.linksTouchable}>
          <ZulipText style={styles.newOrgText}>
            <ZulipText text="Don't have a zulip organisation? " />
            <WebLink label={{ text: '{_}', values: { _: 'create one' } }} url={new URL('https://zulip.com/new/')} />
          </ZulipText>
        </View>
      </Screen>
    );
  }
}
