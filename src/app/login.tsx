import React, { useState } from 'react';
import { StyleSheet, View, Alert, AppState } from 'react-native';
import { supabase } from '../lib/supabase';
import { Button, TextInput, Text, Surface } from 'react-native-paper';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  async function signInWithEmail() {
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({
      email: email,
      password: password,
    });

    if (error) Alert.alert('Error', error.message);
    setLoading(false);
  }

  async function signUpWithEmail() {
    setLoading(true);
    const {
      data: { session },
      error,
    } = await supabase.auth.signUp({
      email: email,
      password: password,
    });

    if (error) Alert.alert('Error', error.message);
    if (!session) Alert.alert('Check your email for the login link!');
    setLoading(false);
  }

  return (
    <Surface style={styles.container}>
      <Text variant="headlineMedium" style={styles.title}>Tommymoto</Text>
      <View style={[styles.verticallySpaced, styles.mt20]}>
        <TextInput
          label="Email"
          left={<TextInput.Icon icon="email" />}
          onChangeText={(text) => setEmail(text)}
          value={email}
          placeholder="email@address.com"
          autoCapitalize={'none'}
        />
      </View>
      <View style={styles.verticallySpaced}>
        <TextInput
          label="Password"
          left={<TextInput.Icon icon="lock" />}
          onChangeText={(text) => setPassword(text)}
          value={password}
          secureTextEntry={true}
          placeholder="Password"
          autoCapitalize={'none'}
        />
      </View>
      <View style={[styles.verticallySpaced, styles.mt20]}>
        <Button mode="contained" disabled={loading} onPress={() => signInWithEmail()}>
          Sign in
        </Button>
      </View>
      <View style={styles.verticallySpaced}>
        <Button mode="outlined" disabled={loading} onPress={() => signUpWithEmail()}>
          Sign up
        </Button>
      </View>
    </Surface>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    justifyContent: 'center',
  },
  title: {
    textAlign: 'center',
    marginBottom: 40,
    fontWeight: 'bold',
  },
  verticallySpaced: {
    paddingTop: 4,
    paddingBottom: 4,
    alignSelf: 'stretch',
  },
  mt20: {
    marginTop: 20,
  },
});
