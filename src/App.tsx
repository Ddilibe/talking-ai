
import { Route, Routes, MemoryRouter as Router } from "react-router-dom";
import './App.css'

import Home from "./pages/home";
import Landing from "./pages/landing";
import NewLayout from "./layout/newlayout";
import Settings from "./pages/settings";

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Landing />} />
        <Route path="/home" element={<NewLayout><Home /></NewLayout>} />
        {/* <Route path="/about" element={<NewLayout></NewLayout><div>About Talking AI Extension</div></NewLayout>} /> */}
        <Route path="/settings" element={<NewLayout><Settings /></NewLayout>} />
      </Routes>
    </Router >
  )
}

export default App
