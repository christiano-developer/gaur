"use client";

import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Search,
  Filter,
  Edit,
  Shield,
  User,
  MoreVertical,
  UserPlus,
  Settings,
  Clock,
  X,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import OfficerForm from "./OfficerForm";
import RoleAssignment from "./RoleAssignment";

interface Officer {
  officer_id?: string;
  id?: number;
  badge_number: string;
  name: string;
  email?: string | null;
  rank: string;
  station?: string | null;
  department?: string;
  active?: boolean;
  status?: "active" | "inactive" | "suspended";
  roles?: any[];
  role_names?: string[];
  permissions?: any[];
  permission_count?: number;
  last_login?: string | null;
  created_at?: string;
  minimum_role_level?: number;
}

interface OfficerListProps {
  onStatsUpdate?: (stats: any) => void;
  showAddForm: boolean;
  onCloseAddForm: () => void;
}

export default function OfficerList({
  onStatsUpdate,
  showAddForm,
  onCloseAddForm,
}: OfficerListProps) {
  const [officers, setOfficers] = useState<Officer[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [hasNext, setHasNext] = useState(false);
  const [editingOfficer, setEditingOfficer] = useState<Officer | null>(null);
  const [roleAssignmentOfficer, setRoleAssignmentOfficer] =
    useState<Officer | null>(null);

  const [filters, setFilters] = useState({
    search: "",
    status: "",
    rank: "",
    station: "",
  });

  useEffect(() => {
    loadOfficers();
  }, [page, filters]);

  const loadOfficers = async () => {
    try {
      setError(null);
      const token = localStorage.getItem("gaur_access_token");

      // Build query parameters
      const params = new URLSearchParams({
        page: page.toString(),
        size: "10",
      });

      // Add filters if they exist
      Object.entries(filters).forEach(([key, value]) => {
        if (value) {
          params.append(key, value);
        }
      });

      const response = await fetch(
        `http://localhost:8000/api/v1/admin/officers?${params}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        },
      );

      if (response.ok) {
        const result = await response.json();
        const data = result.data || result; // Handle wrapped response
        setOfficers(data.officers || []);
        setTotalPages(data.pages || 1);
        setHasNext(data.page < data.pages);

        // Update stats if callback provided
        if (onStatsUpdate) {
          loadStats();
        }
      } else {
        setError("Failed to load officers");
      }
    } catch (error) {
      console.error("Failed to load officers:", error);
      setError("Network error occurred");
    } finally {
      setLoading(false);
    }
  };

  const loadStats = async () => {
    try {
      const token = localStorage.getItem("gaur_access_token");
      const response = await fetch(
        "http://localhost:8000/api/v1/admin/officers/stats",
        {
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        },
      );

      if (response.ok) {
        const result = await response.json();
        const stats = result.data || result;
        onStatsUpdate?.(stats);
      }
    } catch (error) {
      console.error("Failed to load stats:", error);
    }
  };

  const handleStatusUpdate = async (officerId: number, newStatus: string) => {
    try {
      const token = localStorage.getItem("gaur_access_token");
      const response = await fetch(
        `http://localhost:8000/api/v1/admin/officers/${officerId}`,
        {
          method: "PUT",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            status: newStatus,
          }),
        },
      );

      if (response.ok) {
        loadOfficers();
      } else {
        setError("Failed to update officer status");
      }
    } catch (error) {
      console.error("Failed to update officer status:", error);
      setError("Network error occurred");
    }
  };

  const handleFilterChange = (key: string, value: string) => {
    setFilters((prev) => ({ ...prev, [key]: value }));
    setPage(1); // Reset to first page when filters change
  };

  const handlePageChange = (newPage: number) => {
    setPage(newPage);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "active":
        return "bg-green-800 text-green-100";
      case "inactive":
        return "bg-gray-100 text-gray-800";
      case "suspended":
        return "bg-red-100 text-red-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const getRankColor = (rank: string) => {
    const rankColors: Record<string, string> = {
      SuperAdmin: "bg-purple-100 text-purple-800",
      DGP: "bg-red-800 text-red-800",
      IGP: "bg-orange-800 text-orange-800",
      SP: "bg-yellow-100 text-yellow-800",
      Inspector: "bg-blue-800 text-blue-800",
      "Senior Constable": "bg-indigo-700 text-indigo-800",
      Constable: "bg-green-800 text-green-800",
      Superintendent: "bg-green-800 text-green-100",
    };
    return rankColors[rank] || "bg-gray-100 text-gray-800";
  };

  if (loading && officers.length === 0) {
    return (
      <div className="text-center py-8">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-forest-accent-primary mx-auto mb-4"></div>
        <p className="text-forest-text-secondary">Loading officers...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Search and Filter Controls */}
      <Card className="p-6 forest-card-gradient border-forest-border">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-1">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Search by name, badge, or email..."
                value={filters.search}
                onChange={(e) => handleFilterChange("search", e.target.value)}
                className="pl-10"
              />
            </div>
          </div>

          <div className="flex gap-2">
            <Select
              value={filters.status || "all"}
              onValueChange={(value) =>
                handleFilterChange("status", value === "all" ? "" : value)
              }
            >
              <SelectTrigger className="w-32">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="inactive">Inactive</SelectItem>
                <SelectItem value="suspended">Suspended</SelectItem>
              </SelectContent>
            </Select>

            <Select
              value={filters.rank || "all"}
              onValueChange={(value) =>
                handleFilterChange("rank", value === "all" ? "" : value)
              }
            >
              <SelectTrigger className="w-40">
                <SelectValue placeholder="Rank" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Ranks</SelectItem>
                <SelectItem value="SuperAdmin">SuperAdmin</SelectItem>
                <SelectItem value="DGP">DGP</SelectItem>
                <SelectItem value="IGP">IGP</SelectItem>
                <SelectItem value="SP">SP</SelectItem>
                <SelectItem value="Inspector">Inspector</SelectItem>
                <SelectItem value="Senior Constable">
                  Senior Constable
                </SelectItem>
                <SelectItem value="Constable">Constable</SelectItem>
              </SelectContent>
            </Select>

            <Button onClick={loadOfficers} variant="outline" size="sm">
              <Filter className="h-4 w-4 mr-2" />
              Refresh
            </Button>
          </div>
        </div>
      </Card>

      {/* Error Display */}
      {error && (
        <Card className="p-4 border-red-200 bg-red-50">
          <p className="text-red-600">{error}</p>
          <Button
            onClick={loadOfficers}
            variant="outline"
            size="sm"
            className="mt-2"
          >
            Retry
          </Button>
        </Card>
      )}

      {/* Officer List */}
      <div className="space-y-4">
        {officers.length === 0 ? (
          <Card className="p-8 text-center">
            <User className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-600">
              No officers found matching your criteria.
            </p>
          </Card>
        ) : (
          officers.map((officer) => (
            <Card
              key={officer.id || officer.officer_id || officer.badge_number}
              className="p-6"
            >
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-4">
                    <div>
                      <h3 className="text-lg font-semibold text-green-100">
                        {officer.name || "Unknown Officer"}
                      </h3>
                      <p className="text-sm text-green-200">
                        Badge: {officer.badge_number || "N/A"} • Email:{" "}
                        {officer.email ||
                          `${officer.badge_number || "unknown"}@goapolice.gov.in`}
                      </p>
                      <div className="flex items-center gap-2 mt-2">
                        <Badge className={getRankColor(officer.rank || "")}>
                          {officer.rank || "Unknown Rank"}
                        </Badge>
                        <Badge
                          className={getStatusColor(
                            officer.active ? "active" : "inactive",
                          )}
                        >
                          {officer.active ? "Active" : "Inactive"}
                        </Badge>
                        <span className="text-xs text-gray-500">
                          {officer.station ||
                            officer.department ||
                            "Unknown Department"}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="mt-3">
                    <div className="flex items-center gap-4 text-sm text-green-600">
                      <span className="flex items-center gap-1">
                        <Shield className="h-4 w-4" />
                        {
                          (officer.role_names || officer.roles || []).length
                        }{" "}
                        roles
                      </span>
                      <span className="flex items-center gap-1">
                        <Settings className="h-4 w-4 text-white" />
                        {(officer.permissions || []).length} permissions
                      </span>
                      {officer.last_login && (
                        <span className="flex items-center gap-1">
                          <Clock className="h-4 w-4" />
                          Last login:{" "}
                          {new Date(officer.last_login).toLocaleDateString()}
                        </span>
                      )}
                    </div>
                    {(officer.role_names || []).length > 0 && (
                      <div className="mt-2 flex flex-wrap gap-1">
                        {(officer.role_names || []).map((roleName) => (
                          <Badge
                            key={roleName}
                            variant="outline"
                            className="text-xs text-white"
                          >
                            {roleName}
                          </Badge>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <Button
                    onClick={() => setRoleAssignmentOfficer(officer)}
                    variant="outline"
                    size="sm"
                  >
                    <Shield className="h-4 w-4 mr-1" />
                    Roles
                  </Button>

                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="outline" size="sm">
                        <MoreVertical className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem
                        onClick={() => setEditingOfficer(officer)}
                      >
                        <Edit className="h-4 w-4 mr-2" />
                        Edit Officer
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      {officer.status === "active" ? (
                        <DropdownMenuItem
                          onClick={() =>
                            handleStatusUpdate(officer.id, "inactive")
                          }
                          className="text-orange-600"
                        >
                          Deactivate
                        </DropdownMenuItem>
                      ) : (
                        <DropdownMenuItem
                          onClick={() =>
                            handleStatusUpdate(officer.id, "active")
                          }
                          className="text-green-600"
                        >
                          Activate
                        </DropdownMenuItem>
                      )}
                      <DropdownMenuItem
                        onClick={() =>
                          handleStatusUpdate(officer.id, "suspended")
                        }
                        className="text-red-600"
                      >
                        Suspend
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </div>
            </Card>
          ))
        )}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex justify-center items-center space-x-4 py-4">
          <Button
            onClick={() => handlePageChange(page - 1)}
            disabled={page === 1}
            variant="outline"
          >
            Previous
          </Button>

          <span className="text-sm text-gray-600">
            Page {page} of {totalPages}
          </span>

          <Button
            onClick={() => handlePageChange(page + 1)}
            disabled={!hasNext}
            variant="outline"
          >
            Next
          </Button>
        </div>
      )}

      {/* Add Officer Form Modal */}
      {showAddForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-6 border-b">
              <h2 className="text-xl font-semibold">Add New Officer</h2>
              <Button onClick={onCloseAddForm} variant="ghost" size="sm">
                <X className="h-4 w-4" />
              </Button>
            </div>
            <div className="p-6">
              <OfficerForm
                onSuccess={() => {
                  onCloseAddForm();
                  loadOfficers();
                }}
                onCancel={onCloseAddForm}
              />
            </div>
          </div>
        </div>
      )}

      {/* Edit Officer Form Modal */}
      {editingOfficer && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-6 border-b">
              <h2 className="text-xl font-semibold">Edit Officer</h2>
              <Button
                onClick={() => setEditingOfficer(null)}
                variant="ghost"
                size="sm"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
            <div className="p-6">
              <OfficerForm
                officer={editingOfficer}
                onSuccess={() => {
                  setEditingOfficer(null);
                  loadOfficers();
                }}
                onCancel={() => setEditingOfficer(null)}
              />
            </div>
          </div>
        </div>
      )}

      {/* Role Assignment Modal */}
      {roleAssignmentOfficer && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg max-w-xl w-full mx-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-6 border-b">
              <h2 className="text-xl font-semibold">Manage Roles</h2>
              <Button
                onClick={() => setRoleAssignmentOfficer(null)}
                variant="ghost"
                size="sm"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
            <div className="p-6">
              <RoleAssignment
                officer={roleAssignmentOfficer}
                onSuccess={() => {
                  setRoleAssignmentOfficer(null);
                  loadOfficers();
                }}
                onCancel={() => setRoleAssignmentOfficer(null)}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
