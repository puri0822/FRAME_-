import { StyleSheet } from "react-native";
import common from "./common";

export default StyleSheet.create({
  ...common,
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 15,
    paddingVertical: 15,
    borderBottomWidth: 1,
    borderBottomColor: "#f0f0f0",
  },
  backButton: {
    fontSize: 16,
    color: "#FF6B9D",
    fontWeight: "600",
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#333",
  },
  content: {
    paddingHorizontal: 20,
    paddingVertical: 30,
  },
  titleSection: {
    alignItems: "center",
    marginBottom: 30,
  },
  logo: {
    fontSize: 50,
    marginBottom: 10,
  },
  subtitle: {
    fontSize: 16,
    color: "#999",
  },
  formSection: {
    marginBottom: 20,
  },
  hint: {
    fontSize: 12,
    color: "#999",
    marginTop: 5,
  },
  agreeContainer: {
    flexDirection: "row",
    alignItems: "flex-start",
    marginBottom: 20,
    marginTop: 10,
  },
  checkbox: {
    marginRight: 10,
  },
  agreeText: {
    fontSize: 13,
    color: "#333",
    flex: 1,
    lineHeight: 20,
  },
  requiredText: {
    color: "#FF6B9D",
    fontWeight: "bold",
  },
  button: {
    backgroundColor: "#FF6B9D",
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: "center",
    marginTop: 10,
  },
  loginContainer: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    marginTop: 16,
  },
  loginText: {
    fontSize: 14,
    color: "#666",
  },
  loginLink: {
    fontSize: 14,
    color: "#FF6B9D",
    fontWeight: "bold",
  },
});
