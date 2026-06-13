import { C } from "../colors";

export default {
  // home, fridge 공통
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: C.bg,
    alignItems: "center",
    justifyContent: "center",
  },
  // home, explore 공통
  headerBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
  },
  // fridge, explore 공통
  emptyTitle: {
    fontSize: 15,
    fontWeight: "700",
    color: C.text,
  },
  emptyDesc: {
    fontSize: 13,
    color: C.textMuted,
    textAlign: "center",
  },
};
