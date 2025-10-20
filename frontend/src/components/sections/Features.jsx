import React from 'react';

const Features = () => {
  return (
    <section id="features" className="py-20 bg-slate-900/80 backdrop-blur-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16">
          <h2 className="text-4xl font-bold text-white mb-4">The Acacia Problem in Mediterranean Forests</h2>
          <p className="text-xl text-slate-300 max-w-3xl mx-auto">
            Originally from Australia, several species of Acacia have become highly invasive in Mediterranean ecosystems, 
            posing a significant threat to native biodiversity and ecosystem stability.
          </p>
        </div>
        
        <div className="space-y-16">
          {/* Feature 1: Aggressive Colonization */}
          <div className="grid md:grid-cols-2 gap-8 items-center">
            <div>
              <img 
                src="/conhecer_acacia.jpg" 
                alt="Acacia invading a forest" 
                className="rounded-xl shadow-2xl border-4 border-slate-700/50 w-full aspect-square object-cover"
              />
            </div>
            <div>
              <h3 className="text-3xl font-semibold text-white mb-4">Aggressive Colonization</h3>
              <p className="text-slate-300 text-lg leading-relaxed text-justify">
              Acacias spread rapidly, forming dense clusters that outcompete native plants for sunlight, water, and nutrients. This dominance leads to a significant decline in local biodiversity, displacing both native flora and the animals that depend on them.
              </p>
            </div>
          </div>

          {/* Feature 2: Soil Alteration */}
          <div className="grid md:grid-cols-2 gap-8 items-center">
            <div>
              <img 
                src="/Acacia-dealbata_vagem.jpg" 
                alt="Acacia seed pods" 
                className="rounded-xl shadow-2xl border-4 border-slate-700/50 w-full aspect-square object-cover"
              />
            </div>
            <div>
              <h3 className="text-3xl font-semibold text-white mb-4">Soil Alteration & Increased Fire Risk</h3>
              <p className="text-slate-300 text-lg leading-relaxed mb-4 text-justify">
                These plants alter soil chemistry, which can harm native species and promote the growth of other invasive weeds.
              </p>
              <p className="text-slate-300 text-lg leading-relaxed text-justify">
                Furthermore, acacia infestations increase the fuel load in forests. Their dry, flammable biomass leads to more 
                frequent and intense wildfires that can devastate the ecosystem and threaten human settlements.
              </p>
            </div>
          </div>

        </div>
      </div>
    </section>
  );
};

export default Features;
