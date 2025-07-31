const SlotConfig = {
    symbols: {
        WHEEL_Y: { 3: 5, 4: 20, 5: 100, symbolName:"Stop1" },
        TEN: { 3: 5, 4: 20, 5: 100, symbolName:"Stop2" },
        J: { 3: 7, 4: 25, 5: 150, symbolName:"Stop3" },
        K: { 3: 7, 4: 25, 5: 150, symbolName:"Stop4" },
        WING: { 3: 10, 4: 30, 5: 200, symbolName:"Stop5" },
        Q: { 3: 10, 4: 30, 5: 200, symbolName:"Stop6" },
        A: { 3: 15, 4: 75, 5: 500, symbolName:"Stop7" },
        ALTAR: { 3: 15, 4: 75, 5: 500, symbolName:"Stop8" },
        BOOK: { 3: 15, 4: 75, 5: 1000, symbolName:"Stop9" },
        LION: { 2: 5, 3: 100, 4: 250, 5: 2500, symbolName:"Stop10" },
        QUEEN: { 2: 10, 3: 150, 4: 500, 5: 5000, symbolName:"Stop11" },
        MASK: { 3: 3, 4: 10, 5: 100, symbolName:"Stop12" },
        W: { 2: 15, 3: 200, 4: 1000, 5: 5000,symbolName:"Stop13", wild: true }
    },

    paylines: [
        { name: "Top", pattern: [0, 0, 0, 0, 0] },        // lineId: 0
        { name: "Middle", pattern: [1, 1, 1, 1, 1] },     // lineId: 1
        { name: "Bottom", pattern: [2, 2, 2, 2, 2] },     // lineId: 2
        { name: "V_shape", pattern: [0, 1, 2, 1, 0] },    // lineId: 3
        { name: "Inverted_V", pattern: [2, 1, 0, 1, 2] }, // lineId: 4
        { name: "Upward_slope", pattern: [0, 0, 1, 2, 2] },   // lineId: 5
        { name: "Downward_slope", pattern: [2, 2, 1, 0, 0] }, // lineId: 6
        { name: "M_shape", pattern: [1, 0, 1, 0, 1] }, // lineId: 7
        { name: "W_shape", pattern: [1, 2, 1, 2, 1] }, // lineId: 8
        { name: "Hill", pattern: [1, 2, 1, 0, 1] } // lineId: 9
    ]
    
};

export default SlotConfig;
  