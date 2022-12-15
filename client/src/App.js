import React from 'react';
import { BrowserRouter, Route, Routes } from "react-router-dom";
import CreateRoom from "./routes/CreateRoom";
import Room from "./routes/Room";

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route exact path="/" element={<CreateRoom/>} />
        <Route path="/room/:roomID" element={<Room/>} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;