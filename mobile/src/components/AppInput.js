import { View, Text, TextInput, StyleSheet } from "react-native";
import { COLORS, FONTS } from "../theme/tokens";

const AppInput = ({
  label,
  value,
  onChangeText,
  placeholder,
  secureTextEntry = false,
  keyboardType = "default",
  autoCapitalize = "none",
  error,
  ...rest
}) => {
  return (
    <View style={styles.container}>
      {label ? <Text style={styles.label}>{label}</Text> : null}
      <TextInput
        style={[styles.input, error && styles.inputError]}
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor="#94a3b8"
        secureTextEntry={secureTextEntry}
        keyboardType={keyboardType}
        autoCapitalize={autoCapitalize}
        {...rest}
      />
      {error ? <Text style={styles.errorText}>{error}</Text> : null}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginBottom: 16,
  },
  label: {
    fontSize: 14,
    fontFamily: FONTS.bodyMedium,
    color: COLORS.text.dark,
    marginBottom: 6,
  },
  input: {
    borderWidth: 1,
    borderColor: "#cbd5e1",
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    fontFamily: FONTS.body,
    color: COLORS.text.dark,
    backgroundColor: "#fff",
    includeFontPadding: false,
  },
  inputError: {
    borderColor: COLORS.danger,
  },
  errorText: {
    color: COLORS.danger,
    fontSize: 12,
    fontFamily: FONTS.body,
    marginTop: 4,
  },
});

export default AppInput;
