import { StyleSheet } from "react-native";

export default StyleSheet.create({
  tabBar: {
    backgroundColor: "rgba(255,255,255,0.97)",
    borderTopColor: "rgba(0,0,0,0.06)",
    paddingTop: 6,
    elevation: 8,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
  },
  tabLabel: {
    fontSize: 10,
    fontWeight: "600",
    letterSpacing: 0.2,
  },
});
