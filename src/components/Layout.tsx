import { ReactNode, useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { LogOut, User, Settings } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { ProfileForm } from "@/components/ProfileForm";

interface LayoutProps {
  children: ReactNode;
  showNav?: boolean;
}

export const Layout = ({ children, showNav = false }: LayoutProps) => {
  const navigate = useNavigate();
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const [showProfileForm, setShowProfileForm] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  // Close profile menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setShowProfileMenu(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <div className="min-h-screen bg-black text-white relative">
      {showNav && (
        <nav className="border-b border-gray-800 bg-black">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex justify-between items-center h-16">
              {/* Left side navigation */}
              <div className="flex items-center space-x-8 cursor-pointer" onClick={() => navigate("/chat")}>
                <img
                  src="/RAMAAI.png"
                  alt="RAMA AI Logo"
                  className="h-28 w-auto" // Much bigger logo
                />
              </div>

              {/* Right side profile button */}
              <div className="relative" ref={menuRef}>
                <Button
                  variant="ghost"
                  onClick={() => setShowProfileMenu(!showProfileMenu)}
                  className="p-1 text-white"
                >
                  <User className="w-6 h-6" />
                </Button>

                {showProfileMenu && (
                  <div
                    className="absolute right-0 mt-2 w-44 bg-[#1e1e1e]/90 backdrop-blur-md rounded-lg shadow-xl z-50 flex flex-col border border-gray-800"
                  >
                    <button
                      onClick={() => {
                        setShowProfileForm(true);
                        setShowProfileMenu(false);
                      }}
                      className="text-white px-4 py-2 text-left hover:bg-black transition"
                    >
                      Edit Profile
                    </button>

                    <button
                      onClick={() => {
                        navigate("/manage-profile");
                        setShowProfileMenu(false);
                      }}
                      className="text-white px-4 py-2 text-left hover:bg-black flex items-center transition"
                    >
                      <Settings className="w-4 h-4 mr-2 text-purple-400" />
                      Manage Profile
                    </button>

                    <button
                      onClick={() => {
                        localStorage.removeItem("token");
                        navigate("/");
                      }}
                      className="text-white px-4 py-2 text-left hover:bg-black flex items-center transition"
                    >
                      <LogOut className="w-4 h-4 mr-2 text-red-400" />
                      Logout
                    </button>
                  </div>
                )}

                {showProfileForm && (
                  <ProfileForm onClose={() => setShowProfileForm(false)} />
                )}
              </div>
            </div>
          </div>
        </nav>
      )}

      <div className="bg-black">{children}</div>
    </div>
  );
};
