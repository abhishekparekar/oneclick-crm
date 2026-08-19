import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  ScrollView,
  Platform,
  Alert,
  StatusBar,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import * as Print from "expo-print";
import * as Sharing from "expo-sharing";
import api from "../../api/api";
import { useAuth } from "../../context/AuthContext";
import { SHADOWS, COLORS, ROUNDING, FONTS } from "../../theme/tokens";
import CompanyAdminLayout from "../../components/CompanyAdminLayout";

const EmployeeAttendanceCalendarScreen = ({ route, navigation }) => {
  const { employee } = route.params || {};
  const { user } = useAuth();
  const isHR = user?.role === "HR";

  const [currentDate, setCurrentDate] = useState(new Date());
  const [attendanceRecords, setAttendanceRecords] = useState([]);
  const [loading, setLoading] = useState(false);
  const [downloadingReport, setDownloadingReport] = useState(false);

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const firstDayOfWeek = new Date(year, month, 1).getDay();

  const monthNames = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
  const displayMonth = `${monthNames[month]} ${year}`;

  const daysArray = [];
  for (let i = 0; i < firstDayOfWeek; i++) {
    daysArray.push(null);
  }
  for (let d = 1; d <= daysInMonth; d++) {
    daysArray.push(d);
  }

  const isToday = (day) => {
    if (!day) return false;
    const now = new Date();
    return (
      now.getDate() === day &&
      now.getMonth() === month &&
      now.getFullYear() === year
    );
  };

  const presentCount = attendanceRecords.filter(r => r.status === "present").length;
  const absentCount = attendanceRecords.filter(r => r.status === "absent").length;
  const halfDayCount = attendanceRecords.filter(r => r.status === "half_day" || r.status === "late").length;
  const paidCount = presentCount + (halfDayCount * 0.5);

  const generateHtml = () => {
    let rows = "";
    daysArray.forEach(day => {
      if (!day) return;
      const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
      const record = attendanceRecords.find(r => r.date && r.date.startsWith(dateStr));
      const status = record ? record.status : "No Record";

      let badgeColor = "#64748B";
      let statusText = "Absent / No Record";
      if (status === "present") { badgeColor = "#10B981"; statusText = "Present"; }
      else if (status === "absent") { badgeColor = "#EF4444"; statusText = "Absent"; }
      else if (status === "half_day" || status === "late") { badgeColor = "#F59E0B"; statusText = "Half Day / Late"; }

      rows += `
        <tr>
          <td style="padding: 12px 10px; border-bottom: 1px solid #E2E8F0; color: #334155;">${dateStr}</td>
          <td style="padding: 12px 10px; border-bottom: 1px solid #E2E8F0;">
            <span style="background-color: ${badgeColor}; color: white; padding: 4px 10px; border-radius: 12px; font-size: 12px; font-weight: bold;">
              ${statusText}
            </span>
          </td>
        </tr>
      `;
    });

    return `
      <html>
        <head>
          <style>
            body { font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; padding: 40px; color: #0F172A; }
            h1 { color: #0F172A; margin-bottom: 5px; }
            h3 { color: #475569; margin-top: 0; font-weight: normal; margin-bottom: 30px; }
            .stats-container { display: flex; justify-content: space-between; background-color: #F8FAFC; padding: 20px; border-radius: 10px; margin-bottom: 30px; border: 1px solid #E2E8F0; }
            .stat-box { text-align: center; }
            .stat-label { font-size: 12px; color: #64748B; font-weight: bold; text-transform: uppercase; margin-bottom: 5px; }
            .stat-value { font-size: 24px; font-weight: bold; }
            table { width: 100%; border-collapse: collapse; margin-top: 20px; }
            th { text-align: left; padding: 12px 10px; background-color: #F1F5F9; color: #475569; font-size: 14px; border-bottom: 2px solid #CBD5E1; }
          </style>
        </head>
        <body>
          <h1>Attendance Report</h1>
          <h3>Employee: ${employee?.firstName || ''} ${employee?.lastName || ''} | Month: ${displayMonth}</h3>
          
          <div class="stats-container">
            <div class="stat-box">
              <div class="stat-label">Present</div>
              <div class="stat-value" style="color: #10B981;">${presentCount}</div>
            </div>
            <div class="stat-box">
              <div class="stat-label">Absent</div>
              <div class="stat-value" style="color: #EF4444;">${absentCount}</div>
            </div>
            <div class="stat-box">
              <div class="stat-label">Half Day / Late</div>
              <div class="stat-value" style="color: #F59E0B;">${halfDayCount}</div>
            </div>
            <div class="stat-box">
              <div class="stat-label">Paid Days</div>
              <div class="stat-value" style="color: #0F172A;">${paidCount}</div>
            </div>
          </div>

          <table>
            <thead>
              <tr>
                <th>Date</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              ${rows}
            </tbody>
          </table>
        </body>
      </html>
    `;
  };

  const handleDownloadPdf = async () => {
    try {
      setDownloadingReport(true);
      const html = generateHtml();
      const { uri } = await Print.printToFileAsync({ html });

      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(uri, {
          mimeType: 'application/pdf',
          dialogTitle: `Attendance_Report_${employee?.firstName}_${displayMonth}.pdf`,
          UTI: 'com.adobe.pdf'
        });
      } else {
        Alert.alert("Report Generated", `Saved PDF to: ${uri}`);
      }
    } catch (err) {
      Alert.alert("Error", "Could not generate or share the PDF report.");
    } finally {
      setDownloadingReport(false);
    }
  };

  const nextMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1));
  };
  const prevMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1));
  };

  const fetchMonthData = async () => {
    if (!employee?._id) return;
    try {
      setLoading(true);
      const endpoint = isHR
        ? `/hr/attendance/${employee._id}/monthly`
        : `/company/attendance/${employee._id}/monthly`;

      const { data } = await api.get(endpoint, {
        params: {
          month: currentDate.getMonth() + 1,
          year: currentDate.getFullYear()
        }
      });

      if (data && data.attendance) {
        setAttendanceRecords(data.attendance);
      } else if (data && Array.isArray(data)) {
        setAttendanceRecords(data);
      } else {
        setAttendanceRecords([]);
      }
    } catch (err) {
      setAttendanceRecords([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMonthData();
  }, [currentDate, employee]);

  const handleDayPress = (dayNumber) => {
    if (!dayNumber) return;
    const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(dayNumber).padStart(2, '0')}`;
    const record = attendanceRecords.find(r => r.date && r.date.startsWith(dateStr));

    navigation.navigate("EmployeeDailyAttendance", {
      employee,
      date: dateStr,
      record
    });
  };

  return (
    <CompanyAdminLayout
      navigation={navigation}
      headerTitle={`${employee?.firstName || ''} ${employee?.lastName || ''}`}
      showSearch={false}
      activeTab="Attendance"
    >
      <StatusBar barStyle="light-content" backgroundColor="#0F172A" />

      <View style={styles.container}>
        {/* Month Selector Bar */}
        <View style={styles.topSection}>
          <View style={styles.monthSelectorRow}>
            <TouchableOpacity onPress={prevMonth} style={styles.monthArrow} activeOpacity={0.7}>
              <Ionicons name="chevron-back" size={20} color={COLORS.darkNavy} />
            </TouchableOpacity>

            <View style={styles.monthPill}>
              <Ionicons name="calendar-outline" size={16} color={COLORS.primary} style={{ marginRight: 6 }} />
              <Text style={styles.monthPillText}>{displayMonth}</Text>
            </View>

            <TouchableOpacity onPress={nextMonth} style={styles.monthArrow} activeOpacity={0.7}>
              <Ionicons name="chevron-forward" size={20} color={COLORS.darkNavy} />
            </TouchableOpacity>
          </View>
        </View>

        <ScrollView style={styles.scrollContent} showsVerticalScrollIndicator={false}>
          {/* Metrics Summary Card */}
          <View style={styles.statsCard}>
            <View style={styles.statCol}>
              <Text style={[styles.statLabel, { color: "#10B981" }]}>Present</Text>
              <Text style={[styles.statNum, { color: "#10B981" }]}>{presentCount}</Text>
            </View>
            <View style={styles.statSep} />
            <View style={styles.statCol}>
              <Text style={[styles.statLabel, { color: "#EF4444" }]}>Absent</Text>
              <Text style={[styles.statNum, { color: "#EF4444" }]}>{absentCount}</Text>
            </View>
            <View style={styles.statSep} />
            <View style={styles.statCol}>
              <Text style={[styles.statLabel, { color: "#F59E0B" }]}>Half / Late</Text>
              <Text style={[styles.statNum, { color: "#F59E0B" }]}>{halfDayCount}</Text>
            </View>
            <View style={styles.statSep} />
            <View style={styles.statCol}>
              <Text style={[styles.statLabel, { color: COLORS.primary }]}>Paid Days</Text>
              <Text style={[styles.statNum, { color: COLORS.primary }]}>{paidCount}</Text>
            </View>
          </View>

          {/* Calendar Card */}
          <View style={styles.calendarCard}>
            {/* Weekday Headers */}
            <View style={styles.weekDaysRow}>
              {["SUN", "MON", "TUE", "WED", "THU", "FRI", "SAT"].map((day, idx) => (
                <View key={idx} style={styles.weekDayCol}>
                  <Text style={[styles.weekDayText, (idx === 0 || idx === 6) && styles.weekendText]}>{day}</Text>
                </View>
              ))}
            </View>

            {/* Days Grid */}
            {loading ? (
              <ActivityIndicator color={COLORS.primary} style={{ marginVertical: 35 }} />
            ) : (
              <View style={styles.daysGrid}>
                {daysArray.map((day, idx) => {
                  if (!day) {
                    return <View key={idx} style={styles.dayCellContainer} />;
                  }

                  const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
                  const record = attendanceRecords.find(r => r.date && r.date.startsWith(dateStr));
                  const isCurrentDay = isToday(day);

                  let bgStyle = "#F8FAFC";
                  let borderStyle = "#E2E8F0";
                  let textColor = COLORS.darkNavy;
                  let dotColor = null;

                  if (record?.status === "present") {
                    bgStyle = "#ECFDF5";
                    borderStyle = "#A7F3D0";
                    textColor = "#059669";
                    dotColor = "#10B981";
                  } else if (record?.status === "absent") {
                    bgStyle = "#FEF2F2";
                    borderStyle = "#FCA5A5";
                    textColor = "#DC2626";
                    dotColor = "#EF4444";
                  } else if (record?.status === "half_day" || record?.status === "late") {
                    bgStyle = "#FFFBEB";
                    borderStyle = "#FDE68A";
                    textColor = "#D97706";
                    dotColor = "#F59E0B";
                  }

                  if (isCurrentDay) {
                    bgStyle = COLORS.primary;
                    borderStyle = COLORS.primary;
                    textColor = "#FFFFFF";
                  }

                  return (
                    <TouchableOpacity
                      key={idx}
                      style={styles.dayCellContainer}
                      onPress={() => handleDayPress(day)}
                      activeOpacity={0.75}
                    >
                      <View style={[styles.dayCircle, { backgroundColor: bgStyle, borderColor: borderStyle }]}>
                        <Text style={[styles.dayNumText, { color: textColor }]}>{day}</Text>
                      </View>
                      {dotColor && !isCurrentDay ? (
                        <View style={[styles.statusDot, { backgroundColor: dotColor }]} />
                      ) : null}
                    </TouchableOpacity>
                  );
                })}
              </View>
            )}

            {/* Calendar Legend Bar */}
            <View style={styles.legendRow}>
              <View style={styles.legendItem}>
                <View style={[styles.legendDot, { backgroundColor: "#10B981" }]} />
                <Text style={styles.legendText}>Present</Text>
              </View>
              <View style={styles.legendItem}>
                <View style={[styles.legendDot, { backgroundColor: "#EF4444" }]} />
                <Text style={styles.legendText}>Absent</Text>
              </View>
              <View style={styles.legendItem}>
                <View style={[styles.legendDot, { backgroundColor: "#F59E0B" }]} />
                <Text style={styles.legendText}>Half/Late</Text>
              </View>
              <View style={styles.legendItem}>
                <View style={[styles.legendDot, { backgroundColor: COLORS.primary }]} />
                <Text style={styles.legendText}>Today</Text>
              </View>
            </View>
          </View>

          {/* PDF Download Button */}
          <TouchableOpacity
            style={styles.downloadBtnTouch}
            onPress={handleDownloadPdf}
            disabled={downloadingReport}
            activeOpacity={0.85}
          >
            <LinearGradient
              colors={['#F97316', '#EA580C']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.downloadBtnGradient}
            >
              {downloadingReport ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <>
                  <Ionicons name="document-text-outline" size={20} color="#FFFFFF" style={{ marginRight: 8 }} />
                  <Text style={styles.downloadBtnText}>Export Monthly PDF Report</Text>
                </>
              )}
            </LinearGradient>
          </TouchableOpacity>

          <View style={{ height: 30 }} />
        </ScrollView>
      </View>
    </CompanyAdminLayout>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F8FAFC",
  },
  topSection: {
    backgroundColor: "#FFFFFF",
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#E2E8F0",
  },
  monthSelectorRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  monthArrow: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: "#F1F5F9",
    alignItems: "center",
    justifyContent: "center",
  },
  monthPill: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(249, 115, 22, 0.08)",
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "rgba(249, 115, 22, 0.25)",
  },
  monthPillText: {
    fontFamily: FONTS.displayBold,
    fontSize: 14.5,
    color: COLORS.primary,
  },
  scrollContent: {
    padding: 14,
  },
  statsCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    borderRadius: ROUNDING.lg,
    paddingVertical: 14,
    paddingHorizontal: 10,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    ...SHADOWS.sm,
  },
  statCol: {
    flex: 1,
    alignItems: "center",
  },
  statLabel: {
    fontFamily: FONTS.bodyMedium,
    fontSize: 10,
    textTransform: "uppercase",
  },
  statNum: {
    fontFamily: FONTS.displayBold,
    fontSize: 18,
    marginTop: 2,
  },
  statSep: {
    width: 1,
    height: 24,
    backgroundColor: "#E2E8F0",
  },
  calendarCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: ROUNDING.lg,
    padding: 14,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    ...SHADOWS.sm,
  },
  weekDaysRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: "#F1F5F9",
    marginBottom: 10,
  },
  weekDayCol: {
    flex: 1,
    alignItems: "center",
  },
  weekDayText: {
    fontFamily: FONTS.bodyBold,
    fontSize: 11,
    color: COLORS.text.muted,
  },
  weekendText: {
    color: "#EF4444",
  },
  daysGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
  },
  dayCellContainer: {
    width: "14.28%",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 4,
  },
  dayCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
  },
  dayNumText: {
    fontFamily: FONTS.bodyBold,
    fontSize: 13,
  },
  statusDot: {
    width: 5,
    height: 5,
    borderRadius: 2.5,
    marginTop: 3,
  },
  legendRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-around",
    paddingTop: 14,
    marginTop: 10,
    borderTopWidth: 1,
    borderTopColor: "#F1F5F9",
  },
  legendItem: {
    flexDirection: "row",
    alignItems: "center",
  },
  legendDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 5,
  },
  legendText: {
    fontFamily: FONTS.bodyMedium,
    fontSize: 11,
    color: COLORS.text.muted,
  },
  downloadBtnTouch: {
    borderRadius: ROUNDING.lg,
    overflow: "hidden",
    ...SHADOWS.sm,
  },
  downloadBtnGradient: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 14,
  },
  downloadBtnText: {
    fontFamily: FONTS.bodyBold,
    fontSize: 14,
    color: "#FFFFFF",
  },
});

export default EmployeeAttendanceCalendarScreen;
