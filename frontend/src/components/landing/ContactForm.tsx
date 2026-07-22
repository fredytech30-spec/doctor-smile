'use client';

import { motion } from 'framer-motion';
import { Mail, Phone, MapPin, Send, User, Building2, MessageSquare, ArrowLeft } from 'lucide-react';
import { useState } from 'react';
import { CubeLogo } from './CubeLogo';

export function ContactForm() {
  const [formData, setFormData] = useState({
    name: '',
    company: '',
    email: '',
    message: '',
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    console.log('Form submitted:', formData);
  };

  return (
    <section className="py-20 bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 relative overflow-hidden">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-0 rounded-3xl overflow-hidden shadow-2xl shadow-violet-primary/30 border border-violet-primary/20">
          
          {/* Left Panel - Info */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            className="bg-gradient-to-br from-violet-primary/30 via-violet-secondary/20 to-violet-primary/30 p-12 relative overflow-hidden"
          >
            <div className="absolute inset-0 bg-gradient-to-br from-violet-primary/10 via-transparent to-violet-secondary/10"></div>
            
            <div className="relative z-10">
              <div className="flex items-center gap-4 mb-8">
                <CubeLogo />
                <div>
                  <h2 className="font-display font-bold text-3xl text-white">Doctor Smile</h2>
                  <p className="text-violet-200 text-sm">Santé Financière IA</p>
                </div>
              </div>

              <h3 className="font-display font-bold text-4xl text-white mb-4">
                Parlons de votre<br />
                <span className="bg-gradient-to-r from-violet-tertiary to-violet-secondary bg-clip-text text-transparent">santé financière</span>
              </h3>

              <p className="text-violet-100 text-lg mb-12 leading-relaxed">
                Notre équipe d'experts est prête à vous accompagner dans l'analyse et l'optimisation de vos indicateurs financiers.
              </p>

              <div className="space-y-6">
                <div className="flex items-start gap-4">
                  <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-violet-primary/40 to-violet-secondary/40 border border-violet-primary/50 flex items-center justify-center flex-shrink-0 shadow-xl shadow-violet-primary/30">
                    <Mail className="w-6 h-6 text-violet-tertiary" />
                  </div>
                  <div>
                    <h4 className="font-display font-semibold text-lg text-white mb-1">Email</h4>
                    <p className="text-violet-200">contact@doctorsmile.com</p>
                    <p className="text-violet-200">support@doctorsmile.com</p>
                  </div>
                </div>

                <div className="flex items-start gap-4">
                  <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-violet-primary/40 to-violet-secondary/40 border border-violet-primary/50 flex items-center justify-center flex-shrink-0 shadow-xl shadow-violet-primary/30">
                    <Phone className="w-6 h-6 text-violet-tertiary" />
                  </div>
                  <div>
                    <h4 className="font-display font-semibold text-lg text-white mb-1">Téléphone</h4>
                    <p className="text-violet-200">+225 07 00 00 00 00</p>
                    <p className="text-violet-200">Lun - Ven: 9h - 18h</p>
                  </div>
                </div>

                <div className="flex items-start gap-4">
                  <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-violet-primary/40 to-violet-secondary/40 border border-violet-primary/50 flex items-center justify-center flex-shrink-0 shadow-xl shadow-violet-primary/30">
                    <MapPin className="w-6 h-6 text-violet-tertiary" />
                  </div>
                  <div>
                    <h4 className="font-display font-semibold text-lg text-white mb-1">Adresse</h4>
                    <p className="text-violet-200">Abidjan, Côte d'Ivoire</p>
                    <p className="text-violet-200">Plateforme, Cocody</p>
                  </div>
                </div>
              </div>

              <div className="mt-12 pt-8 border-t border-violet-primary/30">
                <div className="grid grid-cols-3 gap-4">
                  <div className="text-center">
                    <div className="text-3xl font-display font-bold text-violet-tertiary">95.4%</div>
                    <div className="text-sm text-violet-200 mt-1">Précision IA</div>
                  </div>
                  <div className="text-center">
                    <div className="text-3xl font-display font-bold text-violet-tertiary">12</div>
                    <div className="text-sm text-violet-200 mt-1">Modèles ML</div>
                  </div>
                  <div className="text-center">
                    <div className="text-3xl font-display font-bold text-violet-tertiary">340ms</div>
                    <div className="text-sm text-violet-200 mt-1">Temps Analyse</div>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>

          {/* Right Panel - Form */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            className="bg-gradient-to-br from-gray-800 to-gray-900 p-12"
          >
            <div className="mb-8">
              <h3 className="font-display font-bold text-3xl text-white mb-2">Envoyez-nous un message</h3>
              <p className="text-gray-400">Remplissez le formulaire ci-dessous et nous vous répondrons dans les plus brefs délais.</p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="space-y-2">
                <label className="block text-sm font-medium text-violet-200 mb-2">Nom complet</label>
                <div className="relative group">
                  <div className="absolute inset-0 bg-gradient-to-r from-violet-primary/30 to-violet-secondary/30 rounded-xl blur-sm opacity-0 group-hover:opacity-100 transition-opacity"></div>
                  <div className="relative">
                    <User className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-violet-400" />
                    <input
                      type="text"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      className="w-full pl-12 pr-4 py-4 bg-gray-900/50 border border-violet-primary/30 rounded-xl focus:border-violet-tertiary focus:ring-2 focus:ring-violet-primary/20 outline-none transition-all text-white placeholder:text-gray-500 backdrop-blur-sm"
                      placeholder="Votre nom"
                    />
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <label className="block text-sm font-medium text-violet-200 mb-2">Entreprise</label>
                <div className="relative group">
                  <div className="absolute inset-0 bg-gradient-to-r from-violet-primary/30 to-violet-secondary/30 rounded-xl blur-sm opacity-0 group-hover:opacity-100 transition-opacity"></div>
                  <div className="relative">
                    <Building2 className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-violet-400" />
                    <input
                      type="text"
                      value={formData.company}
                      onChange={(e) => setFormData({ ...formData, company: e.target.value })}
                      className="w-full pl-12 pr-4 py-4 bg-gray-900/50 border border-violet-primary/30 rounded-xl focus:border-violet-tertiary focus:ring-2 focus:ring-violet-primary/20 outline-none transition-all text-white placeholder:text-gray-500 backdrop-blur-sm"
                      placeholder="Nom de votre entreprise"
                    />
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <label className="block text-sm font-medium text-violet-200 mb-2">Email</label>
                <div className="relative group">
                  <div className="absolute inset-0 bg-gradient-to-r from-violet-primary/30 to-violet-secondary/30 rounded-xl blur-sm opacity-0 group-hover:opacity-100 transition-opacity"></div>
                  <div className="relative">
                    <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-violet-400" />
                    <input
                      type="email"
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      className="w-full pl-12 pr-4 py-4 bg-gray-900/50 border border-violet-primary/30 rounded-xl focus:border-violet-tertiary focus:ring-2 focus:ring-violet-primary/20 outline-none transition-all text-white placeholder:text-gray-500 backdrop-blur-sm"
                      placeholder="votre@email.com"
                    />
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <label className="block text-sm font-medium text-violet-200 mb-2">Message</label>
                <div className="relative group">
                  <div className="absolute inset-0 bg-gradient-to-r from-violet-primary/30 to-violet-secondary/30 rounded-xl blur-sm opacity-0 group-hover:opacity-100 transition-opacity"></div>
                  <div className="relative">
                    <MessageSquare className="absolute left-4 top-4 w-5 h-5 text-violet-400" />
                    <textarea
                      value={formData.message}
                      onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                      rows={5}
                      className="w-full pl-12 pr-4 py-4 bg-gray-900/50 border border-violet-primary/30 rounded-xl focus:border-violet-tertiary focus:ring-2 focus:ring-violet-primary/20 outline-none transition-all text-white placeholder:text-gray-500 resize-none backdrop-blur-sm"
                      placeholder="Votre message..."
                    />
                  </div>
                </div>
              </div>

              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                type="submit"
                className="w-full bg-gradient-to-r from-violet-primary to-violet-secondary hover:from-violet-secondary hover:to-violet-tertiary text-white font-semibold py-4 rounded-xl shadow-xl shadow-violet-primary/40 hover:shadow-violet-primary/60 transition-all flex items-center justify-center gap-2 border border-violet-tertiary/30"
              >
                <Send className="w-5 h-5" />
                Envoyer le message
              </motion.button>
            </form>
          </motion.div>
        </div>
      </div>
    </section>
  );
}
