import React from "react";
import PayrollListScreen from "./PayrollListScreen";

const GeneratePayrollScreen = (props) => {
  const newProps = {
    ...props,
    route: {
      ...props.route,
      params: { ...props.route?.params, activeTab: "generate" },
    },
  };
  return <PayrollListScreen {...newProps} />;
};

export default GeneratePayrollScreen;
