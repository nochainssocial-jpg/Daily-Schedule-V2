import React from "react";
import { Text, View, type StyleProp, type ViewStyle } from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { styles } from "./dashboardStyles";

type Props = {
  staffName: string;
  staffColor: string;
  staffTextColor: string;
  style?: StyleProp<ViewStyle>;
  children: React.ReactNode;
};

/**
 * Shared compact tile used by Team Assignments, Cleaning and Drop Offs.
 * Keeping one component prevents the three dashboard panels drifting apart.
 */
export function CompactDashboardTile({
  staffName,
  staffColor,
  staffTextColor,
  style,
  children,
}: Props) {
  return (
    <View style={[styles.compactDashboardTile, style]}>
      <View
        style={[
          styles.compactDashboardStaffPill,
          { backgroundColor: staffColor, borderColor: staffColor },
        ]}
      >
        <Text
          style={[styles.compactDashboardStaffName, { color: staffTextColor }]}
          numberOfLines={1}
        >
          {staffName}
        </Text>
      </View>

      <MaterialCommunityIcons
        name="chevron-right"
        size={18}
        color="#9CA3AF"
        style={styles.compactDashboardChevron}
      />

      <View style={styles.compactDashboardTileContent}>{children}</View>
    </View>
  );
}
