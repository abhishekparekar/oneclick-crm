import { TouchableOpacity, Text, StyleSheet, ActivityIndicator } from "react-native";
import { COLORS, FONTS } from "../theme/tokens";

const AppButton = ({
  title,
  onPress,
  variant = "primary",
  disabled = false,
  loading = false,
  style,
}) => {
  const isOutline = variant === "outline";

  return (
    <TouchableOpacity
      style={[
        styles.button,
        isOutline ? styles.outline : styles.primary,
        (disabled || loading) && styles.disabled,
        style,
      ]}
      onPress={onPress}
      disabled={disabled || loading}
      activeOpacity={0.8}
    >
      {loading ? (
        <ActivityIndicator color={isOutline ? COLORS.primary : "#fff"} />
      ) : (
        <Text style={[styles.text, isOutline && styles.outlineText]}>{title}</Text>
      )}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  button: {
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    minHeight: 48,
  },
  primary: {
    backgroundColor: COLORS.primary,
  },
  outline: {
    backgroundColor: "transparent",
    borderWidth: 1,
    borderColor: COLORS.primary,
  },
  disabled: {
    opacity: 0.6,
  },
  text: {
    color: "#fff",
    fontSize: 16,
    fontFamily: FONTS.bodyBold,
  },
  outlineText: {
    color: COLORS.primary,
  },
});

export default AppButton;
