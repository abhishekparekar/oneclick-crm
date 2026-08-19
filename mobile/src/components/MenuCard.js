import { TouchableOpacity, Text, StyleSheet } from "react-native";
import AppCard from "./AppCard";

const MenuCard = ({ title, subtitle, onPress }) => {
  return (
    <TouchableOpacity onPress={onPress} activeOpacity={0.8}>
      <AppCard style={styles.card}>
        <Text style={styles.title}>{title}</Text>
        {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
      </AppCard>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  card: {
    marginBottom: 12,
  },
  title: {
    fontSize: 16,
    fontWeight: "600",
    color: "#111827",
  },
  subtitle: {
    fontSize: 13,
    color: "#6b7280",
    marginTop: 4,
  },
});

export default MenuCard;
