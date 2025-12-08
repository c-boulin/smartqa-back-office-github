import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Hexagon, Users, Loader, CheckCircle, ArrowLeft } from 'lucide-react';
import Button from '../components/UI/Button';
import Card from '../components/UI/Card';
import { apiService, Team } from '../services/api';
import { useAuth } from '../context/AuthContext';
import toast from 'react-hot-toast';

const TeamSelection: React.FC = () => {
  const navigate = useNavigate();
  const { state, dispatch } = useAuth();
  const [teams, setTeams] = useState<Team[]>([]);
  const [selectedTeamId, setSelectedTeamId] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (!state.isAuthenticated) {
      navigate('/login');
      return;
    }

    const isSuperAdmin = state.user?.role?.slug === 'superadmin';

    if (isSuperAdmin) {
      navigate('/projects');
      return;
    }

    const hasValidTeamId = state.user?.team_id &&
                            state.user.team_id !== 'null' &&
                            state.user.team_id !== '';

    if (hasValidTeamId) {
      navigate('/projects');
      return;
    }

    fetchTeams();
  }, [state.isAuthenticated, state.user, navigate]);

  const fetchTeams = async () => {
    try {
      setIsLoading(true);
      const response = await apiService.getTeams();
      const teams = response.data.map(team => ({
        id: team.attributes.id,
        name: team.attributes.name,
        description: team.attributes.description
      }));
      setTeams(teams);
    } catch (error) {
      console.error('Failed to fetch teams:', error);
      toast.error('Failed to load teams. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!selectedTeamId) {
      toast.error('Please select a team');
      return;
    }

    try {
      setIsSubmitting(true);
      const response = await apiService.selectTeam(selectedTeamId);

      const apiData = response.data.attributes || response.data;

      const updatedUser = {
        ...state.user!,
        team_id: String(selectedTeamId),
        role_id: apiData.role_id,
        role: apiData.role,
        permissions: apiData.permissions || apiData.role?.permissions || state.user!.permissions || [],
      };

      localStorage.setItem('user_data', JSON.stringify(updatedUser));
      dispatch({ type: 'SET_USER', payload: updatedUser });

      toast.success('Team selected successfully!');

      setTimeout(() => {
        navigate('/projects');
      }, 500);
    } catch (error) {
      console.error('Failed to select team:', error);
      toast.error('Failed to select team. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleBackToHome = () => {
    localStorage.removeItem('auth_token');
    localStorage.removeItem('user_data');
    dispatch({ type: 'LOGOUT' });
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-slate-100 to-slate-50 dark:from-slate-900 dark:via-slate-800 dark:to-slate-900 flex items-center justify-center px-6">
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute -top-40 -right-40 w-80 h-80 bg-gradient-to-r from-cyan-400/10 to-purple-500/10 rounded-full blur-3xl"></div>
          <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-gradient-to-r from-purple-400/10 to-pink-500/10 rounded-full blur-3xl"></div>
        </div>

        <div className="relative">
          <Loader className="w-12 h-12 text-cyan-400 animate-spin" />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-slate-100 to-slate-50 dark:from-slate-900 dark:via-slate-800 dark:to-slate-900 flex items-center justify-center px-6">
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-gradient-to-r from-cyan-400/10 to-purple-500/10 rounded-full blur-3xl"></div>
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-gradient-to-r from-purple-400/10 to-pink-500/10 rounded-full blur-3xl"></div>
      </div>

      <div className="relative w-full max-w-md">
        <Link
          to="/"
          onClick={handleBackToHome}
          className="inline-flex items-center text-slate-600 dark:text-gray-300 hover:text-cyan-600 dark:hover:text-cyan-400 transition-colors mb-8"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Home
        </Link>

        <Card gradient className="p-8">
          <div className="text-center mb-8">
            <div className="flex justify-center mb-4">
              <div className="relative">
                <div className="w-16 h-16 bg-gradient-to-r from-cyan-400 to-purple-500 rounded-full flex items-center justify-center">
                  <Hexagon className="w-8 h-8 text-slate-900 dark:text-white fill-slate-900/20 dark:fill-white/20" />
                </div>
                <div className="absolute inset-0 bg-gradient-to-r from-cyan-400 to-purple-500 opacity-30 rounded-full blur-lg"></div>
              </div>
            </div>
            <h1 className="text-2xl font-bold mb-2">
              <span className="bg-gradient-to-r from-cyan-400 to-purple-400 bg-clip-text text-transparent">
                SMARTQA
              </span>
            </h1>
            <p className="text-slate-600 dark:text-gray-400">Select Your Team</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label htmlFor="team" className="block text-sm font-medium text-slate-700 dark:text-gray-300 mb-2">
                <div className="flex items-center">
                  <Users className="w-4 h-4 mr-2 text-cyan-400" />
                  Team
                </div>
              </label>
              <select
                id="team"
                value={selectedTeamId || ''}
                onChange={(e) => setSelectedTeamId(Number(e.target.value))}
                className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-600 rounded-lg text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-cyan-400 focus:border-transparent transition-all"
                disabled={isSubmitting}
                required
              >
                <option value="">Select a team...</option>
                {teams.map((team) => (
                  <option key={team.id} value={team.id}>
                    {team.name}
                  </option>
                ))}
              </select>
              {teams.length === 0 && (
                <p className="mt-2 text-sm text-red-400">No teams available. Please contact your administrator.</p>
              )}
            </div>

            <Button
              type="submit"
              variant="primary"
              className="w-full"
              disabled={isSubmitting || !selectedTeamId || teams.length === 0}
            >
              {isSubmitting ? (
                <span className="flex items-center justify-center">
                  <Loader className="w-5 h-5 mr-2 animate-spin" />
                  Selecting Team...
                </span>
              ) : (
                <span className="flex items-center justify-center">
                  <CheckCircle className="w-5 h-5 mr-2" />
                  Continue
                </span>
              )}
            </Button>
          </form>

          <div className="mt-6 text-center text-sm text-slate-600 dark:text-gray-400">
            <p>You'll be assigned to the selected team and can start using SMARTQA.</p>
          </div>
        </Card>
      </div>
    </div>
  );
};

export default TeamSelection;
