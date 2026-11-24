import React, { useState } from 'react';
import { StyleSheet, View, Alert, Platform } from 'react-native';
import { supabase } from '../lib/supabase';
import { Button, TextInput, Text, Surface } from 'react-native-paper';
import { useAuthStore } from '../lib/store';
import { useRouter } from 'expo-router';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const { setOfflineMode } = useAuthStore();
  const router = useRouter();

  function getFriendlyErrorMessage(err: any): string {
    const raw = (err?.message || String(err || '')).toLowerCase();
    if (
      raw.includes('unknownhostexception') ||
      raw.includes('unable to resolve host') ||
      raw.includes('fetch failed') ||
      raw.includes('network request failed') ||
      raw.includes('failed to fetch') ||
      raw.includes('enotfound') ||
      raw.includes('econnrefused')
    ) {
      return 'Não foi possível ligar ao servidor. A base de dados pode estar em pausa ou sem ligação à internet.\n\nPode tocar em "Modo Local" para continuar offline com os dados guardados neste dispositivo.';
    }
    if (raw.includes('invalid login credentials') || raw.includes('invalid_grant')) {
      return 'Email ou palavra-passe incorretos.';
    }
    if (raw.includes('email not confirmed')) {
      return 'O seu email ainda não foi confirmado. Verifique a sua caixa de correio.';
    }
    if (raw.includes('user already registered')) {
      return 'Este email já está registado. Experimente iniciar sessão.';
    }
    return err?.message || 'Ocorreu um erro ao tentar iniciar sessão.';
  }

  async function signInWithEmail() {
    if (!email.trim() || !password) {
      Alert.alert('Aviso', 'Por favor preencha o email e a palavra-passe.');
      return;
    }
    setLoading(true);
    try {
      const { error } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password: password,
      });

      if (error) {
        Alert.alert('Erro de Ligação', getFriendlyErrorMessage(error));
      }
    } catch (err: any) {
      Alert.alert('Erro de Ligação', getFriendlyErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }

  async function signUpWithEmail() {
    if (!email.trim() || !password) {
      Alert.alert('Aviso', 'Por favor preencha o email e a palavra-passe.');
      return;
    }
    setLoading(true);
    try {
      const {
        data: { session },
        error,
      } = await supabase.auth.signUp({
        email: email.trim(),
        password: password,
      });

      if (error) {
        Alert.alert('Erro', getFriendlyErrorMessage(error));
      } else if (!session) {
        Alert.alert('Sucesso', 'Verifique o seu email para confirmar a conta.');
      }
    } catch (err: any) {
      Alert.alert('Erro', getFriendlyErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }

  function handleContinueOffline() {
    setOfflineMode(true);
    router.replace('/');
  }

  return (
    <Surface style={styles.container}>
      <Text variant="headlineMedium" style={styles.title}>Tommymoto</Text>

      {/* Credentials form container configured for Android/Bitwarden autofill */}
      <View style={styles.formContainer}>
        <View style={styles.verticallySpaced}>
          <TextInput
            label="Email"
            left={<TextInput.Icon icon="email" />}
            onChangeText={(text) => setEmail(text)}
            value={email}
            placeholder="email@address.com"
            autoCapitalize="none"
            keyboardType="email-address"
            textContentType="username"
            autoComplete="username"
            importantForAutofill="yes"
            nativeID="username"
            id="username"
            accessibilityLabel="Email ou Nome de utilizador"
          />
        </View>
        <View style={styles.verticallySpaced}>
          <TextInput
            label="Password"
            left={<TextInput.Icon icon="lock" />}
            onChangeText={(text) => setPassword(text)}
            value={password}
            secureTextEntry={!showPassword}
            right={
              <TextInput.Icon 
                icon={showPassword ? "eye" : "eye-off"} 
                onPress={() => setShowPassword(!showPassword)} 
              />
            }
            placeholder="Password"
            autoCapitalize="none"
            textContentType="password"
            autoComplete="current-password"
            autoCorrect={false}
            importantForAutofill="yes"
            nativeID="password"
            id="password"
            accessibilityLabel="Palavra-passe"
          />
        </View>
      </View>

      <View style={[styles.verticallySpaced, styles.mt20]}>
        <Button mode="contained" loading={loading} disabled={loading} onPress={signInWithEmail}>
          Sign in
        </Button>
      </View>
      <View style={styles.verticallySpaced}>
        <Button mode="outlined" disabled={loading} onPress={signUpWithEmail}>
          Sign up
        </Button>
      </View>
      <View style={[styles.verticallySpaced, styles.mt10]}>
        <Button mode="contained-tonal" icon="database" onPress={handleContinueOffline}>
          Entrar em Modo Local (Offline)
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
  formContainer: {
    width: '100%',
  },
  verticallySpaced: {
    paddingTop: 4,
    paddingBottom: 4,
    alignSelf: 'stretch',
  },
  mt20: {
    marginTop: 20,
  },
  mt10: {
    marginTop: 10,
  },
});
