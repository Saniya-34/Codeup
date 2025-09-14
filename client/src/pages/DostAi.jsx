import React from "react";
import DostAI from "../components/DostAi";

const DostAIPage = () => {
  return (
    <div className="min-h-screen bg-background p-8 flex items-center justify-center">
      <DostAI isOpenByDefault={true} />
    </div>
  );
};

export default DostAIPage;