/** Backend returns "Employee"; mobile UI often labels the same role as "Team Member". */
export const isEmployeeRole = (role) => role === "Employee" || role === "Team Member";

export const isManagerRole = (role) => role === "Manager";

export const isEmployeeOrManagerRole = (role) =>
  isEmployeeRole(role) || isManagerRole(role);
