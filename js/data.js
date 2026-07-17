/* js/data.js */

// Global Data Storage Namespace
window.CRM_DATA = (() => {
  // Static Definitions
  const PROJECTS = [
    { id: "p1", name: "Sunrise Heights", location: "Whitefield, Bengaluru", totalUnits: 240, availableUnits: 45, priceRange: "₹75L - ₹1.2Cr" },
    { id: "p2", name: "Royal Residency", location: "Gachibowli, Hyderabad", totalUnits: 180, availableUnits: 28, priceRange: "₹1.1Cr - ₹1.8Cr" },
    { id: "p3", name: "Green Meadows Villa", location: "Sohna Road, Gurugram", totalUnits: 90, availableUnits: 12, priceRange: "₹2.2Cr - ₹3.5Cr" },
    { id: "p4", name: "Skyline Towers", location: "Kanjurmarg, Mumbai", totalUnits: 320, availableUnits: 88, priceRange: "₹1.5Cr - ₹2.6Cr" },
    { id: "p5", name: "Ocean Breeze Condos", location: "ECR, Chennai", totalUnits: 110, availableUnits: 19, priceRange: "₹90L - ₹1.6Cr" },
    { id: "p6", name: "Palacio Enclave", location: "New Town, Kolkata", totalUnits: 150, availableUnits: 34, priceRange: "₹60L - ₹95L" }
  ];

  const EXECUTIVES = [
    { id: "e1", name: "Rajesh Sharma", email: "rajesh.s@builder.com", phone: "+91 98765 43210", designation: "Sr. Sales Executive", status: "Active" },
    { id: "e2", name: "Priya Patel", email: "priya.p@builder.com", phone: "+91 98234 56789", designation: "Sales Relationship Manager", status: "Active" },
    { id: "e3", name: "Amit Verma", email: "amit.v@builder.com", phone: "+91 97123 45678", designation: "Sales Executive", status: "Active" },
    { id: "e4", name: "Neha Gupta", email: "neha.g@builder.com", phone: "+91 96012 34567", designation: "Sr. Business Manager", status: "Active" },
    { id: "e5", name: "Vikram Singh", email: "vikram.s@builder.com", phone: "+91 95987 65432", designation: "Sales Executive", status: "Active" },
    { id: "e6", name: "Sneha Reddy", email: "sneha.r@builder.com", phone: "+91 98876 54321", designation: "Client Relationship Officer", status: "Active" }
  ];

  const LEAD_SOURCES = [
    { id: "s1", name: "Website Direct", active: true },
    { id: "s2", name: "MagicBricks", active: true },
    { id: "s3", name: "99acres", active: true },
    { id: "s4", name: "Housing.com", active: true },
    { id: "s5", name: "Walk-in", active: true },
    { id: "s6", name: "Referral", active: true },
    { id: "s7", name: "Facebook Ads", active: true },
    { id: "s8", name: "Instagram Portal", active: true }
  ];

  const LOST_REASONS = [
    { id: "r1", name: "Budget Constraints", color: "badge-danger" },
    { id: "r2", name: "Chose Competitor", color: "badge-warning" },
    { id: "r3", name: "Location Issue", color: "badge-info" },
    { id: "r4", name: "Delayed Possession", color: "badge-neutral" },
    { id: "r5", name: "Better Offer", color: "badge-danger" }
  ];

  // 25+ Realistic Dummy Leads
  const LEADS = [
    {
      id: "LD-1001",
      date: "2026-07-01",
      name: "Aarav Mehta",
      mobile: "+91 98112 23344",
      email: "aarav.mehta@yahoo.com",
      project: "Sunrise Heights",
      budget: "₹85 Lakhs",
      budgetValue: 8500000,
      source: "MagicBricks",
      executive: "Rajesh Sharma",
      status: "Site Visit Done",
      nextFollowUp: "2026-07-16",
      remarks: [
        { date: "2026-07-02", user: "Rajesh Sharma", text: "Client interested in 2BHK East facing flat." },
        { date: "2026-07-08", user: "Rajesh Sharma", text: "Site visit completed with family. They liked tower B flat 503." }
      ],
      history: [
        { date: "2026-07-01", type: "Created", detail: "Lead captured from MagicBricks portal." },
        { date: "2026-07-02", type: "Call", detail: "Introductory call completed. Shared brochures via WhatsApp." },
        { date: "2026-07-08", type: "Meeting", detail: "Site visit arranged and completed." }
      ]
    },
    {
      id: "LD-1002",
      date: "2026-07-03",
      name: "Ananya Deshmukh",
      mobile: "+91 98223 34455",
      email: "ananya.d@gmail.com",
      project: "Royal Residency",
      budget: "₹1.4 Crores",
      budgetValue: 14000000,
      source: "Website Direct",
      executive: "Priya Patel",
      status: "Negotiation",
      nextFollowUp: "2026-07-15",
      remarks: [
        { date: "2026-07-04", user: "Priya Patel", text: "Requested customized payment timeline options." }
      ],
      history: [
        { date: "2026-07-03", type: "Created", detail: "Lead registered on corporate website form." },
        { date: "2026-07-04", type: "Call", detail: "Follow-up conversation. Budget aligned." },
        { date: "2026-07-10", type: "Site Visit", detail: "Showroom and construction tour completed." }
      ]
    },
    {
      id: "LD-1003",
      date: "2026-07-04",
      name: "Rahul Nair",
      mobile: "+91 98334 45566",
      email: "rahul.nair@hotmail.com",
      project: "Skyline Towers",
      budget: "₹1.8 Crores",
      budgetValue: 18000000,
      source: "99acres",
      executive: "Amit Verma",
      status: "New",
      nextFollowUp: "2026-07-17",
      remarks: [],
      history: [
        { date: "2026-07-04", type: "Created", detail: "Lead received from 99acres." }
      ]
    },
    {
      id: "LD-1004",
      date: "2026-07-05",
      name: "Vikram Malhotra",
      mobile: "+91 98445 56677",
      email: "v.malhotra@gmail.com",
      project: "Green Meadows Villa",
      budget: "₹2.8 Crores",
      budgetValue: 28000000,
      source: "Referral",
      executive: "Neha Gupta",
      status: "Contacted",
      nextFollowUp: "2026-07-16",
      remarks: [
        { date: "2026-07-06", user: "Neha Gupta", text: "Client resides in USA, will visit next month. Brother will visit site." }
      ],
      history: [
        { date: "2026-07-05", type: "Created", detail: "Referral received from existing resident Mr. Kapoor." }
      ]
    },
    {
      id: "LD-1005",
      date: "2026-07-05",
      name: "Sneha Iyer",
      mobile: "+91 98556 67788",
      email: "sneha.iyer@live.com",
      project: "Palacio Enclave",
      budget: "₹75 Lakhs",
      budgetValue: 7500000,
      source: "Facebook Ads",
      executive: "Vikram Singh",
      status: "Site Visit Done",
      nextFollowUp: "2026-07-18",
      remarks: [],
      history: [
        { date: "2026-07-05", type: "Created", detail: "Captured via FB Lead Form." }
      ]
    },
    {
      id: "LD-1006",
      date: "2026-07-06",
      name: "Aaditya Joshi",
      mobile: "+91 98667 78899",
      email: "aaditya.joshi@outlook.com",
      project: "Ocean Breeze Condos",
      budget: "₹1.1 Crores",
      budgetValue: 11000000,
      source: "Walk-in",
      executive: "Sneha Reddy",
      status: "Qualified",
      nextFollowUp: "2026-07-19",
      remarks: [
        { date: "2026-07-06", user: "Sneha Reddy", text: "Walked into the site office. Ready to book if discount is offered." }
      ],
      history: [
        { date: "2026-07-06", type: "Walk-in", detail: "Visited ECR site office directly." }
      ]
    },
    {
      id: "LD-1007",
      date: "2026-07-07",
      name: "Meera Krishnan",
      mobile: "+91 98778 89900",
      email: "meera.krish@gmail.com",
      project: "Sunrise Heights",
      budget: "₹95 Lakhs",
      budgetValue: 9500000,
      source: "Housing.com",
      executive: "Rajesh Sharma",
      status: "Qualified",
      nextFollowUp: "2026-07-20",
      remarks: [],
      history: [
        { date: "2026-07-07", type: "Created", detail: "Registered through Housing.com Portal." }
      ]
    },
    {
      id: "LD-1008",
      date: "2026-07-07",
      name: "Rohan Saxena",
      mobile: "+91 98889 90011",
      email: "rohan.sax@yahoo.com",
      project: "Royal Residency",
      budget: "₹1.6 Crores",
      budgetValue: 16000000,
      source: "Instagram Portal",
      executive: "Priya Patel",
      status: "New",
      nextFollowUp: "2026-07-16",
      remarks: [],
      history: [
        { date: "2026-07-07", type: "Created", detail: "Inquiry generated from IG story swipe up." }
      ]
    },
    {
      id: "LD-1009",
      date: "2026-07-08",
      name: "Divya Sen",
      mobile: "+91 98990 01122",
      email: "divya.sen@outlook.com",
      project: "Skyline Towers",
      budget: "₹2.2 Crores",
      budgetValue: 22000000,
      source: "Website Direct",
      executive: "Amit Verma",
      status: "Contacted",
      nextFollowUp: "2026-07-18",
      remarks: [],
      history: [
        { date: "2026-07-08", type: "Created", detail: "Registered on contact form." }
      ]
    },
    {
      id: "LD-1010",
      date: "2026-07-08",
      name: "Sanjay Singhal",
      mobile: "+91 99112 23344",
      email: "sanjay.singhal@outlook.com",
      project: "Green Meadows Villa",
      budget: "₹3.2 Crores",
      budgetValue: 32000000,
      source: "Referral",
      executive: "Neha Gupta",
      status: "Negotiation",
      nextFollowUp: "2026-07-15",
      remarks: [
        { date: "2026-07-09", user: "Neha Gupta", text: "Asking for modular kitchen setup customization inclusion." }
      ],
      history: [
        { date: "2026-07-08", type: "Created", detail: "Created by Neha Gupta." }
      ]
    },
    {
      id: "LD-1011",
      date: "2026-07-09",
      name: "Karan Johar",
      mobile: "+91 99223 34455",
      email: "karan.j@gmail.com",
      project: "Palacio Enclave",
      budget: "₹80 Lakhs",
      budgetValue: 8000000,
      source: "MagicBricks",
      executive: "Vikram Singh",
      status: "Contacted",
      nextFollowUp: "2026-07-21",
      remarks: [],
      history: []
    },
    {
      id: "LD-1012",
      date: "2026-07-09",
      name: "Prerna Sharma",
      mobile: "+91 99334 45566",
      email: "prerna.sharma@yahoo.co.in",
      project: "Ocean Breeze Condos",
      budget: "₹1.3 Crores",
      budgetValue: 13000000,
      source: "99acres",
      executive: "Sneha Reddy",
      status: "New",
      nextFollowUp: "2026-07-17",
      remarks: [],
      history: []
    },
    {
      id: "LD-1013",
      date: "2026-07-10",
      name: "Abhishek Bachchan",
      mobile: "+91 99445 56677",
      email: "abhishek.b@live.com",
      project: "Sunrise Heights",
      budget: "₹90 Lakhs",
      budgetValue: 9000000,
      source: "Facebook Ads",
      executive: "Rajesh Sharma",
      status: "Qualified",
      nextFollowUp: "2026-07-22",
      remarks: [],
      history: []
    },
    {
      id: "LD-1014",
      date: "2026-07-10",
      name: "Shilpa Shetty",
      mobile: "+91 99556 67788",
      email: "shilpa.s@gmail.com",
      project: "Royal Residency",
      budget: "₹1.5 Crores",
      budgetValue: 15000000,
      source: "Walk-in",
      executive: "Priya Patel",
      status: "Site Visit Done",
      nextFollowUp: "2026-07-19",
      remarks: [],
      history: []
    },
    {
      id: "LD-1015",
      date: "2026-07-11",
      name: "Hrithik Roshan",
      mobile: "+91 99667 78899",
      email: "hrithik.r@outlook.com",
      project: "Skyline Towers",
      budget: "₹2.0 Crores",
      budgetValue: 20000000,
      source: "Housing.com",
      executive: "Amit Verma",
      status: "Negotiation",
      nextFollowUp: "2026-07-20",
      remarks: [],
      history: []
    },
    {
      id: "LD-1016",
      date: "2026-07-11",
      name: "Kriti Sanon",
      mobile: "+91 99778 89900",
      email: "kriti.sanon@gmail.com",
      project: "Green Meadows Villa",
      budget: "₹3.0 Crores",
      budgetValue: 30000000,
      source: "Referral",
      executive: "Neha Gupta",
      status: "New",
      nextFollowUp: "2026-07-23",
      remarks: [],
      history: []
    },
    {
      id: "LD-1017",
      date: "2026-07-12",
      name: "Varun Dhawan",
      mobile: "+91 99889 90011",
      email: "varun.d@yahoo.com",
      project: "Palacio Enclave",
      budget: "₹70 Lakhs",
      budgetValue: 7000000,
      source: "Instagram Portal",
      executive: "Vikram Singh",
      status: "Contacted",
      nextFollowUp: "2026-07-24",
      remarks: [],
      history: []
    },
    {
      id: "LD-1018",
      date: "2026-07-12",
      name: "Alia Bhatt",
      mobile: "+91 99990 01122",
      email: "alia.bhatt@live.in",
      project: "Ocean Breeze Condos",
      budget: "₹1.2 Crores",
      budgetValue: 12000000,
      source: "Website Direct",
      executive: "Sneha Reddy",
      status: "Qualified",
      nextFollowUp: "2026-07-25",
      remarks: [],
      history: []
    },
    {
      id: "LD-1019",
      date: "2026-07-13",
      name: "Ranveer Singh",
      mobile: "+91 98123 45670",
      email: "ranveer.s@gmail.com",
      project: "Sunrise Heights",
      budget: "₹1.1 Crores",
      budgetValue: 11000000,
      source: "MagicBricks",
      executive: "Rajesh Sharma",
      status: "Site Visit Done",
      nextFollowUp: "2026-07-26",
      remarks: [],
      history: []
    },
    {
      id: "LD-1020",
      date: "2026-07-13",
      name: "Deepika Padukone",
      mobile: "+91 98234 56701",
      email: "deepika.p@hotmail.com",
      project: "Royal Residency",
      budget: "₹1.7 Crores",
      budgetValue: 17000000,
      source: "99acres",
      executive: "Priya Patel",
      status: "Negotiation",
      nextFollowUp: "2026-07-15",
      remarks: [],
      history: []
    },
    {
      id: "LD-1021",
      date: "2026-07-14",
      name: "Rajkummar Rao",
      mobile: "+91 98345 67812",
      email: "rajkummar.r@gmail.com",
      project: "Skyline Towers",
      budget: "₹2.4 Crores",
      budgetValue: 24000000,
      source: "Housing.com",
      executive: "Amit Verma",
      status: "New",
      nextFollowUp: "2026-07-27",
      remarks: [],
      history: []
    },
    {
      id: "LD-1022",
      date: "2026-07-14",
      name: "Ayushmann Khurrana",
      mobile: "+91 98456 78923",
      email: "ayushmann.k@yahoo.com",
      project: "Green Meadows Villa",
      budget: "₹3.5 Crores",
      budgetValue: 35000000,
      source: "Referral",
      executive: "Neha Gupta",
      status: "Contacted",
      nextFollowUp: "2026-07-28",
      remarks: [],
      history: []
    },
    {
      id: "LD-1023",
      date: "2026-07-15",
      name: "Bhumi Pednekar",
      mobile: "+91 98567 89034",
      email: "bhumi.p@outlook.com",
      project: "Palacio Enclave",
      budget: "₹85 Lakhs",
      budgetValue: 8500000,
      source: "Walk-in",
      executive: "Vikram Singh",
      status: "Qualified",
      nextFollowUp: "2026-07-29",
      remarks: [],
      history: []
    },
    {
      id: "LD-1024",
      date: "2026-07-15",
      name: "Vicky Kaushal",
      mobile: "+91 98678 90145",
      email: "vicky.k@live.com",
      project: "Ocean Breeze Condos",
      budget: "₹1.5 Crores",
      budgetValue: 15000000,
      source: "Facebook Ads",
      executive: "Sneha Reddy",
      status: "Site Visit Done",
      nextFollowUp: "2026-07-30",
      remarks: [],
      history: []
    },
    {
      id: "LD-1025",
      date: "2026-07-15",
      name: "Katrina Kaif",
      mobile: "+91 98789 01256",
      email: "katrina.k@gmail.com",
      project: "Sunrise Heights",
      budget: "₹1.0 Crore",
      budgetValue: 10000000,
      source: "Instagram Portal",
      executive: "Rajesh Sharma",
      status: "New",
      nextFollowUp: "2026-07-16",
      remarks: [],
      history: []
    }
  ];

  // 20+ Realistic Dummy Customers
  const CUSTOMERS = [
    {
      id: "CUST-5001",
      name: "Ishaan Kapoor",
      contact: "+91 99111 22233",
      email: "ishaan.kapoor@gmail.com",
      project: "Sunrise Heights",
      budget: "₹88 Lakhs",
      budgetValue: 8800000,
      executive: "Rajesh Sharma",
      status: "Agreement Pending",
      address: "Flat 402, Oakwood Apts, Indiranagar, Bengaluru",
      propInterest: { tower: "Tower A", flatNo: "A-804", config: "2BHK", area: "1250 sq ft", floor: "8th Floor" },
      notes: "Customer has paid booking amount. Agreement draft sent.",
      history: [
        { date: "2026-06-15", detail: "Qualified lead from Website." },
        { date: "2026-06-20", detail: "Site visit done, selected A-804." },
        { date: "2026-06-25", detail: "Token booking amount of ₹5,00,000 received." }
      ],
      documents: ["PAN Card", "Aadhaar Card", "Application Form"]
    },
    {
      id: "CUST-5002",
      name: "Kabir Malhotra",
      contact: "+91 99222 33344",
      email: "kabir.m@hotmail.com",
      project: "Royal Residency",
      budget: "₹1.5 Crores",
      budgetValue: 15000000,
      executive: "Priya Patel",
      status: "Registered",
      address: "House 24, Road 4, Jubilee Hills, Hyderabad",
      propInterest: { tower: "Tower Block A", flatNo: "A-1502", config: "3BHK", area: "1850 sq ft", floor: "15th Floor" },
      notes: "Registration process successfully completed. Bank loan disbursement received.",
      history: [
        { date: "2026-05-10", detail: "Site Visit." },
        { date: "2026-05-18", detail: "Booking confirmed. CLP Plan selected." },
        { date: "2026-06-30", detail: "Registration done at Sub-registrar office." }
      ],
      documents: ["PAN Card", "Aadhaar Card", "Sale Deed", "Allotment Letter"]
    },
    {
      id: "CUST-5003",
      name: "Riya Sen",
      contact: "+91 99333 44455",
      email: "riya.sen@yahoo.co.in",
      project: "Skyline Towers",
      budget: "₹1.9 Crores",
      budgetValue: 19000000,
      executive: "Amit Verma",
      status: "Agreement Executed",
      address: "A-501, Raheja Heights, Malad East, Mumbai",
      propInterest: { tower: "Tower 2", flatNo: "B-2104", config: "3BHK", area: "1600 sq ft", floor: "21st Floor" },
      notes: "Agreement signed by both parties. Preparing document for registration.",
      history: [
        { date: "2026-06-01", detail: "Walk-in inquiry." },
        { date: "2026-06-05", detail: "Token booking ₹2,00,000 received." },
        { date: "2026-07-02", detail: "Sale agreement executed." }
      ],
      documents: ["PAN Card", "Aadhaar Card", "Agreement to Sell", "NOC"]
    },
    {
      id: "CUST-5004",
      name: "Aaditya Roy",
      contact: "+91 99444 55566",
      email: "aaditya.roy@outlook.com",
      project: "Green Meadows Villa",
      budget: "₹3.1 Crores",
      budgetValue: 31000000,
      executive: "Neha Gupta",
      status: "Agreement Pending",
      address: "B-98, Sushant Lok Phase 1, Gurugram",
      propInterest: { tower: "Block D", flatNo: "Villa-12", config: "4BHK Villa", area: "3800 sq ft", floor: "G+2 Floors" },
      notes: "Awaiting bank approval check verification for NRI housing loan.",
      history: [],
      documents: ["Application Form", "NRI Declarations"]
    },
    {
      id: "CUST-5005",
      name: "Kiara Advani",
      contact: "+91 99555 66677",
      email: "kiara.a@gmail.com",
      project: "Palacio Enclave",
      budget: "₹82 Lakhs",
      budgetValue: 8200000,
      executive: "Vikram Singh",
      status: "Registered",
      address: "12/1A, Ballygunge Circular Rd, Kolkata",
      propInterest: { tower: "Block 3", flatNo: "3-402", config: "2BHK", area: "1100 sq ft", floor: "4th Floor" },
      notes: "Sale deed registered. Keys will be handed over on final possession schedule.",
      history: [],
      documents: ["PAN Card", "Sale Deed", "Possession Letter"]
    },
    {
      id: "CUST-5006",
      name: "Siddharth Malhotra",
      contact: "+91 99666 77788",
      email: "siddharth.m@live.com",
      project: "Ocean Breeze Condos",
      budget: "₹1.4 Crores",
      budgetValue: 14000000,
      executive: "Sneha Reddy",
      status: "Agreement Executed",
      address: "Sea View Villa, ECR Road, Chennai",
      propInterest: { tower: "Tower A", flatNo: "A-901", config: "3BHK Condo", area: "1750 sq ft", floor: "9th Floor" },
      notes: "Checking final measurements of parking space before registration.",
      history: [],
      documents: ["Aadhaar Card", "Agreement to Sell"]
    },
    {
      id: "CUST-5007",
      name: "Devendra Fadnavis",
      contact: "+91 99777 88899",
      email: "devendra.f@outlook.com",
      project: "Skyline Towers",
      budget: "₹2.2 Crores",
      budgetValue: 22000000,
      executive: "Amit Verma",
      status: "Agreement Pending",
      address: "Varsha Bungalow, Malabar Hill, Mumbai",
      propInterest: { tower: "Tower 1", flatNo: "A-3201", config: "3BHK", area: "1900 sq ft", floor: "32nd Floor" },
      notes: "VIP booking, customized security enhancements requested.",
      history: [],
      documents: ["PAN Card", "Allotment Letter"]
    },
    {
      id: "CUST-5008",
      name: "Mamata Banerjee",
      contact: "+91 99888 99900",
      email: "mamata.b@gmail.com",
      project: "Palacio Enclave",
      budget: "₹90 Lakhs",
      budgetValue: 9000000,
      executive: "Vikram Singh",
      status: "Registered",
      address: "30B, Harish Chatterjee Street, Kolkata",
      propInterest: { tower: "Block 1", flatNo: "1-102", config: "2BHK", area: "1200 sq ft", floor: "1st Floor" },
      notes: "Fully paid. Registration completed.",
      history: [],
      documents: ["All documents submitted and verified"]
    },
    {
      id: "CUST-5009",
      name: "Arvind Kejriwal",
      contact: "+91 99999 00011",
      email: "arvind.k@yahoo.com",
      project: "Green Meadows Villa",
      budget: "₹2.8 Crores",
      budgetValue: 28000000,
      executive: "Neha Gupta",
      status: "Agreement Executed",
      address: "6, Flagstaff Road, Civil Lines, Delhi",
      propInterest: { tower: "Block A", flatNo: "Villa-05", config: "4BHK Villa", area: "3600 sq ft", floor: "G+2" },
      notes: "Agreement signed, registration date fixed for next Friday.",
      history: [],
      documents: ["Aadhaar", "PAN", "Sale Agreement"]
    },
    {
      id: "CUST-5010",
      name: "M. K. Stalin",
      contact: "+91 98111 55566",
      email: "mk.stalin@live.in",
      project: "Ocean Breeze Condos",
      budget: "₹1.6 Crores",
      budgetValue: 16000000,
      executive: "Sneha Reddy",
      status: "Agreement Pending",
      address: "Chittaranjan Road, Alwarpet, Chennai",
      propInterest: { tower: "Tower B", flatNo: "B-1204", config: "3BHK Condo", area: "1800 sq ft", floor: "12th Floor" },
      notes: "Client has asked for layout adjustments on balcony partitions.",
      history: [],
      documents: ["PAN", "Aadhaar"]
    },
    {
      id: "CUST-5011",
      name: "Rahul Gandhi",
      contact: "+91 98222 66677",
      email: "rahul.g@congress.org",
      project: "Green Meadows Villa",
      budget: "₹3.3 Crores",
      budgetValue: 33000000,
      executive: "Neha Gupta",
      status: "Registered",
      address: "12, Tughlak Lane, New Delhi",
      propInterest: { tower: "Block C", flatNo: "Villa-21", config: "4BHK Villa", area: "4000 sq ft", floor: "G+2" },
      notes: "Registration complete, security clearance review done.",
      history: [],
      documents: ["Complete files"]
    },
    {
      id: "CUST-5012",
      name: "Narendra Modi",
      contact: "+91 98333 77788",
      email: "narendra.m@pmo.gov.in",
      project: "Skyline Towers",
      budget: "₹2.6 Crores",
      budgetValue: 26000000,
      executive: "Amit Verma",
      status: "Registered",
      address: "7, Lok Kalyan Marg, New Delhi",
      propInterest: { tower: "Tower 1", flatNo: "A-4501", config: "Penthouse", area: "4500 sq ft", floor: "45th Floor" },
      notes: "Top-floor penthouse booking registered.",
      history: [],
      documents: ["Verified and sealed"]
    },
    {
      id: "CUST-5013",
      name: "Amit Shah",
      contact: "+91 98444 88899",
      email: "amit.shah@mha.gov.in",
      project: "Royal Residency",
      budget: "₹1.8 Crores",
      budgetValue: 18000000,
      executive: "Priya Patel",
      status: "Agreement Executed",
      address: "6, Kushak Road, New Delhi",
      propInterest: { tower: "Tower Block B", flatNo: "B-2201", config: "3BHK", area: "2100 sq ft", floor: "22nd Floor" },
      notes: "Agreement executed. Home loan through SBI is in progress.",
      history: [],
      documents: ["PAN", "Aadhaar", "Agreement to Sell"]
    },
    {
      id: "CUST-5014",
      name: "Yogi Adityanath",
      contact: "+91 98555 99900",
      email: "yogi.a@up.gov.in",
      project: "Sunrise Heights",
      budget: "₹92 Lakhs",
      budgetValue: 9200000,
      executive: "Rajesh Sharma",
      status: "Agreement Pending",
      address: "5, Kalidas Marg, Lucknow",
      propInterest: { tower: "Tower C", flatNo: "C-1102", config: "2BHK", area: "1300 sq ft", floor: "11th Floor" },
      notes: "Waiting for power of attorney documents from local representative.",
      history: [],
      documents: ["Application details"]
    },
    {
      id: "CUST-5015",
      name: "Naveen Patnaik",
      contact: "+91 98666 00011",
      email: "naveen.p@odisha.gov.in",
      project: "Ocean Breeze Condos",
      budget: "₹1.5 Crores",
      budgetValue: 15000000,
      executive: "Sneha Reddy",
      status: "Agreement Executed",
      address: "Naveen Nivas, Aerodrome Road, Bhubaneswar",
      propInterest: { tower: "Tower A", flatNo: "A-1402", config: "3BHK", area: "1780 sq ft", floor: "14th Floor" },
      notes: "Agreement signed, booking schedule running smoothly.",
      history: [],
      documents: ["Agreement", "ID proofs"]
    },
    {
      id: "CUST-5016",
      name: "Nitish Kumar",
      contact: "+91 98777 11122",
      email: "nitish.k@bihar.gov.in",
      project: "Palacio Enclave",
      budget: "₹78 Lakhs",
      budgetValue: 7800000,
      executive: "Vikram Singh",
      status: "Agreement Pending",
      address: "1, Aney Marg, Patna",
      propInterest: { tower: "Block 2", flatNo: "2-701", config: "2BHK", area: "1150 sq ft", floor: "7th Floor" },
      notes: "Awaiting token check confirmation.",
      history: [],
      documents: ["PAN Check"]
    },
    {
      id: "CUST-5017",
      name: "Bhagwant Mann",
      contact: "+91 98888 22233",
      email: "bhagwant.m@punjab.gov.in",
      project: "Green Meadows Villa",
      budget: "₹2.9 Crores",
      budgetValue: 29000000,
      executive: "Neha Gupta",
      status: "Registered",
      address: "CM House, Sector 2, Chandigarh",
      propInterest: { tower: "Block B", flatNo: "Villa-08", config: "4BHK Villa", area: "3700 sq ft", floor: "G+2" },
      notes: "Registration complete, all payments received.",
      history: [],
      documents: ["Registered Sale Deed"]
    },
    {
      id: "CUST-5018",
      name: "Sukhvinder Sukhu",
      contact: "+91 98999 33344",
      email: "sukhvinder.s@hp.gov.in",
      project: "Sunrise Heights",
      budget: "₹82 Lakhs",
      budgetValue: 8200000,
      executive: "Rajesh Sharma",
      status: "Agreement Executed",
      address: "Oakover, Shimla",
      propInterest: { tower: "Tower B", flatNo: "B-404", config: "2BHK", area: "1220 sq ft", floor: "4th Floor" },
      notes: "Agreement executed. Loan verification running.",
      history: [],
      documents: ["PAN", "Aadhaar", "Sale Agreement"]
    },
    {
      id: "CUST-5019",
      name: "Hemant Soren",
      contact: "+91 99000 44455",
      email: "hemant.s@jharkhand.gov.in",
      project: "Palacio Enclave",
      budget: "₹84 Lakhs",
      budgetValue: 8400000,
      executive: "Vikram Singh",
      status: "Agreement Pending",
      address: "Kanke Road CM House, Ranchi",
      propInterest: { tower: "Block 4", flatNo: "4-803", config: "2BHK", area: "1180 sq ft", floor: "8th Floor" },
      notes: "Awaiting document verification for tax declaration.",
      history: [],
      documents: ["Application Details"]
    },
    {
      id: "CUST-5020",
      name: "Pinarayi Vijayan",
      contact: "+91 99111 55566",
      email: "pinarayi.v@kerala.gov.in",
      project: "Ocean Breeze Condos",
      budget: "₹1.45 Crores",
      budgetValue: 14500000,
      executive: "Sneha Reddy",
      status: "Registered",
      address: "Cliff House, Nanthancodu, Trivandrum",
      propInterest: { tower: "Tower A", flatNo: "A-1102", config: "3BHK", area: "1720 sq ft", floor: "11th Floor" },
      notes: "Registered successfully. Possession scheduled for Dec 2026.",
      history: [],
      documents: ["Sale Deed", "PAN", "Aadhaar"]
    }
  ];

  // 15+ Closed Deals (Bookings)
  const CLOSED_DEALS = [
    {
      bookingNo: "BK-9001",
      customer: "Kabir Malhotra",
      project: "Royal Residency",
      unit: "A-1502",
      area: "1850 sq ft",
      bookingValue: "₹1.48 Crores",
      bookingValueNum: 14800000,
      bookingAmount: "₹15,00,000",
      paymentPlan: "Construction Linked Plan (CLP)",
      agreementStatus: "Executed",
      registrationStatus: "Completed",
      paymentMilestones: [
        { milestone: "Booking Amount", percentage: "10%", amount: "₹14,80,000", status: "Paid" },
        { milestone: "On Excavation", percentage: "10%", amount: "₹14,80,000", status: "Paid" },
        { milestone: "On Plinth Level", percentage: "15%", amount: "₹22,20,000", status: "Paid" },
        { milestone: "On 5th Floor Slab", percentage: "15%", amount: "₹22,20,000", status: "Overdue" },
        { milestone: "On Brickwork", percentage: "20%", amount: "₹29,60,000", status: "Pending" },
        { milestone: "On Possession", percentage: "30%", amount: "₹44,40,000", status: "Pending" }
      ]
    },
    {
      bookingNo: "BK-9002",
      customer: "Kiara Advani",
      project: "Palacio Enclave",
      unit: "3-402",
      area: "1100 sq ft",
      bookingValue: "₹82 Lakhs",
      bookingValueNum: 8200000,
      bookingAmount: "₹8,00,000",
      paymentPlan: "Possession Linked Plan (PLP)",
      agreementStatus: "Executed",
      registrationStatus: "Completed",
      paymentMilestones: [
        { milestone: "Booking Amount", percentage: "20%", amount: "₹16,40,000", status: "Paid" },
        { milestone: "Superstructure", percentage: "30%", amount: "₹24,60,000", status: "Paid" },
        { milestone: "On Possession", percentage: "50%", amount: "₹41,00,000", status: "Pending" }
      ]
    },
    {
      bookingNo: "BK-9003",
      customer: "Riya Sen",
      project: "Skyline Towers",
      unit: "B-2104",
      area: "1600 sq ft",
      bookingValue: "₹1.88 Crores",
      bookingValueNum: 18800000,
      bookingAmount: "₹20,00,000",
      paymentPlan: "Time Linked Plan (TLP)",
      agreementStatus: "Executed",
      registrationStatus: "Pending",
      paymentMilestones: [
        { milestone: "Booking Token", percentage: "10%", amount: "₹18,80,000", status: "Paid" },
        { milestone: "Month 3 Demand", percentage: "20%", amount: "₹37,60,000", status: "Paid" },
        { milestone: "Month 6 Demand", percentage: "20%", amount: "₹37,60,000", status: "Paid" },
        { milestone: "Month 12 Demand", percentage: "20%", amount: "₹37,60,000", status: "Pending" },
        { milestone: "On Possession", percentage: "30%", amount: "₹56,40,000", status: "Pending" }
      ]
    },
    {
      bookingNo: "BK-9004",
      customer: "Arvind Kejriwal",
      project: "Green Meadows Villa",
      unit: "Villa-05",
      area: "3600 sq ft",
      bookingValue: "₹2.75 Crores",
      bookingValueNum: 27500000,
      bookingAmount: "₹30,00,000",
      paymentPlan: "CLP",
      agreementStatus: "Executed",
      registrationStatus: "Applied",
      paymentMilestones: []
    },
    {
      bookingNo: "BK-9005",
      customer: "Rahul Gandhi",
      project: "Green Meadows Villa",
      unit: "Villa-21",
      area: "4000 sq ft",
      bookingValue: "₹3.25 Crores",
      bookingValueNum: 32500000,
      bookingAmount: "₹35,00,000",
      paymentPlan: "Down Payment Plan (DPP)",
      agreementStatus: "Executed",
      registrationStatus: "Completed",
      paymentMilestones: []
    },
    {
      bookingNo: "BK-9006",
      customer: "Narendra Modi",
      project: "Skyline Towers",
      unit: "A-4501",
      area: "4500 sq ft",
      bookingValue: "₹2.60 Crores",
      bookingValueNum: 26000000,
      bookingAmount: "₹50,00,000",
      paymentPlan: "Down Payment Plan (DPP)",
      agreementStatus: "Executed",
      registrationStatus: "Completed",
      paymentMilestones: []
    },
    {
      bookingNo: "BK-9007",
      customer: "Bhagwant Mann",
      project: "Green Meadows Villa",
      unit: "Villa-08",
      area: "3700 sq ft",
      bookingValue: "₹2.90 Crores",
      bookingValueNum: 29000000,
      bookingAmount: "₹30,00,000",
      paymentPlan: "CLP",
      agreementStatus: "Executed",
      registrationStatus: "Completed",
      paymentMilestones: []
    },
    {
      bookingNo: "BK-9008",
      customer: "Pinarayi Vijayan",
      project: "Ocean Breeze Condos",
      unit: "A-1102",
      area: "1720 sq ft",
      bookingValue: "₹1.40 Crores",
      bookingValueNum: 14000000,
      bookingAmount: "₹15,00,000",
      paymentPlan: "CLP",
      agreementStatus: "Executed",
      registrationStatus: "Completed",
      paymentMilestones: []
    },
    {
      bookingNo: "BK-9009",
      customer: "Ishaan Kapoor",
      project: "Sunrise Heights",
      unit: "A-804",
      area: "1250 sq ft",
      bookingValue: "₹85 Lakhs",
      bookingValueNum: 8500000,
      bookingAmount: "₹8,50,000",
      paymentPlan: "CLP",
      agreementStatus: "Pending",
      registrationStatus: "Pending",
      paymentMilestones: []
    },
    {
      bookingNo: "BK-9010",
      customer: "Siddharth Malhotra",
      project: "Ocean Breeze Condos",
      unit: "A-901",
      area: "1750 sq ft",
      bookingValue: "₹1.35 Crores",
      bookingValueNum: 13500000,
      bookingAmount: "₹13,50,000",
      paymentPlan: "CLP",
      agreementStatus: "Executed",
      registrationStatus: "Pending",
      paymentMilestones: []
    },
    {
      bookingNo: "BK-9011",
      customer: "Amit Shah",
      project: "Royal Residency",
      unit: "B-2201",
      area: "2100 sq ft",
      bookingValue: "₹1.75 Crores",
      bookingValueNum: 17500000,
      bookingAmount: "₹17,50,000",
      paymentPlan: "CLP",
      agreementStatus: "Executed",
      registrationStatus: "Pending",
      paymentMilestones: []
    },
    {
      bookingNo: "BK-9012",
      customer: "Naveen Patnaik",
      project: "Ocean Breeze Condos",
      unit: "A-1402",
      area: "1780 sq ft",
      bookingValue: "₹1.48 Crores",
      bookingValueNum: 14800000,
      bookingAmount: "₹15,00,000",
      paymentPlan: "CLP",
      agreementStatus: "Executed",
      registrationStatus: "Pending",
      paymentMilestones: []
    },
    {
      bookingNo: "BK-9013",
      customer: "Sukhvinder Sukhu",
      project: "Sunrise Heights",
      unit: "B-404",
      area: "1220 sq ft",
      bookingValue: "₹82 Lakhs",
      bookingValueNum: 8200000,
      bookingAmount: "₹8,00,000",
      paymentPlan: "CLP",
      agreementStatus: "Executed",
      registrationStatus: "Pending",
      paymentMilestones: []
    },
    {
      bookingNo: "BK-9014",
      customer: "Mamata Banerjee",
      project: "Palacio Enclave",
      unit: "1-102",
      area: "1200 sq ft",
      bookingValue: "₹90 Lakhs",
      bookingValueNum: 9000000,
      bookingAmount: "₹9,00,000",
      paymentPlan: "DPP",
      agreementStatus: "Executed",
      registrationStatus: "Completed",
      paymentMilestones: []
    },
    {
      bookingNo: "BK-9015",
      customer: "Yash Vardhan",
      project: "Palacio Enclave",
      unit: "4-1002",
      area: "1150 sq ft",
      bookingValue: "₹88 Lakhs",
      bookingValueNum: 8800000,
      bookingAmount: "₹9,00,000",
      paymentPlan: "CLP",
      agreementStatus: "Executed",
      registrationStatus: "Completed",
      paymentMilestones: []
    }
  ];

  // 10+ Lost Opportunities
  const LOST_DEALS = [
    { leadNo: "LD-901", customer: "Rajesh Kumar", project: "Sunrise Heights", lostDate: "2026-07-02", lostReason: "Budget Constraints", competitor: "Prestige Group", executive: "Rajesh Sharma" },
    { leadNo: "LD-902", customer: "Suhail Dev", project: "Palacio Enclave", lostDate: "2026-07-04", lostReason: "Location Issue", competitor: "Shristi Infrastructure", executive: "Vikram Singh" },
    { leadNo: "LD-903", customer: "Aanchal Goel", project: "Skyline Towers", lostDate: "2026-07-05", lostReason: "Chose Competitor", competitor: "LODHA Group", executive: "Amit Verma" },
    { leadNo: "LD-904", customer: "Parthiv Patel", project: "Royal Residency", lostDate: "2026-07-07", lostReason: "Delayed Possession", competitor: "Aparna Constructions", executive: "Priya Patel" },
    { leadNo: "LD-905", customer: "Manoj Bajpayee", project: "Green Meadows Villa", lostDate: "2026-07-08", lostReason: "Better Offer", competitor: "DLF Premium", executive: "Neha Gupta" },
    { leadNo: "LD-906", customer: "Nisha Rawal", project: "Sunrise Heights", lostDate: "2026-07-10", lostReason: "Budget Constraints", competitor: "Sobha Developers", executive: "Rajesh Sharma" },
    { leadNo: "LD-907", customer: "Manish Malhotra", project: "Skyline Towers", lostDate: "2026-07-11", lostReason: "Chose Competitor", competitor: "Godrej Properties", executive: "Amit Verma" },
    { leadNo: "LD-908", customer: "Gautam Gambhir", project: "Green Meadows Villa", lostDate: "2026-07-12", lostReason: "Location Issue", competitor: "M3M India", executive: "Neha Gupta" },
    { leadNo: "LD-909", customer: "Sunidhi Chauhan", project: "Ocean Breeze Condos", lostDate: "2026-07-13", lostReason: "Delayed Possession", competitor: "Casagrand Builder", executive: "Sneha Reddy" },
    { leadNo: "LD-910", customer: "Anurag Kashyap", project: "Palacio Enclave", lostDate: "2026-07-14", lostReason: "Better Offer", competitor: "Ambuja Neotia", executive: "Vikram Singh" }
  ];

  // 30+ Follow-ups
  const FOLLOW_UPS = [
    { id: "F-1", date: "2026-07-15", customer: "Ananya Deshmukh", type: "WhatsApp", executive: "Priya Patel", nextFollowUp: "2026-07-18", status: "Pending", notes: "Send customized CLP excel sheet calculations." },
    { id: "F-2", date: "2026-07-15", customer: "Sanjay Singhal", type: "Meeting", executive: "Neha Gupta", nextFollowUp: "2026-07-20", status: "Completed", notes: "Negotiated kitchen additions. Client happy, closing token next week." },
    { id: "F-3", date: "2026-07-15", customer: "Deepika Padukone", type: "Call", executive: "Priya Patel", nextFollowUp: "2026-07-19", status: "Pending", notes: "Call back after 6:00 PM for flat selection updates." },
    { id: "F-4", date: "2026-07-15", customer: "Katrina Kaif", type: "Call", executive: "Rajesh Sharma", nextFollowUp: "2026-07-16", status: "Pending", notes: "Introductory follow-up on Instagram inquiry." },
    { id: "F-5", date: "2026-07-15", customer: "Aarav Mehta", type: "Site Visit", executive: "Rajesh Sharma", nextFollowUp: "2026-07-22", status: "Completed", notes: "Arranged second site visit for home loan checking." },
    { id: "F-6", date: "2026-07-15", customer: "Vikram Malhotra", type: "Call", executive: "Neha Gupta", nextFollowUp: "2026-07-25", status: "Pending", notes: "Discuss layout queries with brother." },
    { id: "F-7", date: "2026-07-15", customer: "Amit Shah", type: "WhatsApp", executive: "Priya Patel", nextFollowUp: "2026-07-17", status: "Completed", notes: "Shared loan NOC bank lists." },
    { id: "F-8", date: "2026-07-15", customer: "Mamata Banerjee", type: "Meeting", executive: "Vikram Singh", nextFollowUp: "2026-07-30", status: "Completed", notes: "Site office visit. Registration scheduled details." },
    { id: "F-9", date: "2026-07-16", customer: "Rohan Saxena", type: "Call", executive: "Priya Patel", nextFollowUp: "2026-07-20", status: "Pending", notes: "Follow up on initial brochure review." },
    { id: "F-10", date: "2026-07-16", customer: "Prerna Sharma", type: "Call", executive: "Sneha Reddy", nextFollowUp: "2026-07-22", status: "Pending", notes: "Identify standard BHK requirement." },
    { id: "F-11", date: "2026-07-16", customer: "Devendra Fadnavis", type: "Meeting", executive: "Amit Verma", nextFollowUp: "2026-07-23", status: "Pending", notes: "Meet manager to close agreement details." },
    { id: "F-12", date: "2026-07-17", customer: "Rahul Nair", type: "Call", executive: "Amit Verma", nextFollowUp: "2026-07-20", status: "Pending", notes: "Introductory details inquiry check." },
    { id: "F-13", date: "2026-07-17", customer: "Sneha Iyer", type: "Site Visit", executive: "Vikram Singh", nextFollowUp: "2026-07-24", status: "Pending", notes: "Site visit booked for 11:30 AM." },
    { id: "F-14", date: "2026-07-18", customer: "Aaditya Joshi", type: "WhatsApp", executive: "Sneha Reddy", nextFollowUp: "2026-07-22", status: "Pending", notes: "Confirm pricing details discussion check." },
    { id: "F-15", date: "2026-07-19", customer: "Meera Krishnan", type: "Call", executive: "Rajesh Sharma", nextFollowUp: "2026-07-25", status: "Pending", notes: "Send loan EMI charts." },
    { id: "F-16", date: "2026-07-20", customer: "Divya Sen", type: "Call", executive: "Amit Verma", nextFollowUp: "2026-07-26", status: "Pending", notes: "Follow up on 3BHK flat plan options." },
    { id: "F-17", date: "2026-07-21", customer: "Karan Johar", type: "Call", executive: "Vikram Singh", nextFollowUp: "2026-07-27", status: "Pending", notes: "Arrange site visit schedule." },
    { id: "F-18", date: "2026-07-22", customer: "Abhishek Bachchan", type: "Call", executive: "Rajesh Sharma", nextFollowUp: "2026-07-28", status: "Pending", notes: "Discuss location layouts parameters." },
    { id: "F-19", date: "2026-07-23", customer: "Shilpa Shetty", type: "Site Visit", executive: "Priya Patel", nextFollowUp: "2026-07-29", status: "Pending", notes: "Review sample flat tower view." },
    { id: "F-20", date: "2026-07-24", customer: "Hrithik Roshan", type: "Meeting", executive: "Amit Verma", nextFollowUp: "2026-07-30", status: "Pending", notes: "Site visit follow up meeting." },
    { id: "F-21", date: "2026-07-25", customer: "Kriti Sanon", type: "Call", executive: "Neha Gupta", nextFollowUp: "2026-07-31", status: "Pending", notes: "Check budget allocations for penthouse options." },
    { id: "F-22", date: "2026-07-26", customer: "Varun Dhawan", type: "WhatsApp", executive: "Vikram Singh", nextFollowUp: "2026-08-01", status: "Pending", notes: "Send block-wise floor specifications." },
    { id: "F-23", date: "2026-07-27", customer: "Alia Bhatt", type: "Call", executive: "Sneha Reddy", nextFollowUp: "2026-08-02", status: "Pending", notes: "Intro call follow-up." },
    { id: "F-24", date: "2026-07-28", customer: "Ranveer Singh", type: "Site Visit", executive: "Rajesh Sharma", nextFollowUp: "2026-08-04", status: "Pending", notes: "Re-confirm site visit dates." },
    { id: "F-25", date: "2026-07-29", customer: "Rajkummar Rao", type: "Call", executive: "Amit Verma", nextFollowUp: "2026-08-05", status: "Pending", notes: "Call to understand timeline urgency." },
    { id: "F-26", date: "2026-07-30", customer: "Ayushmann Khurrana", type: "Call", executive: "Neha Gupta", nextFollowUp: "2026-08-06", status: "Pending", notes: "Follow up call on luxury towers availability." },
    { id: "F-27", date: "2026-07-31", customer: "Bhumi Pednekar", type: "WhatsApp", executive: "Vikram Singh", nextFollowUp: "2026-08-07", status: "Pending", notes: "Send location coordinates details map." },
    { id: "F-28", date: "2026-08-01", customer: "Vicky Kaushal", type: "Call", executive: "Sneha Reddy", nextFollowUp: "2026-08-08", status: "Pending", notes: "Call post check clearance validation." },
    { id: "F-29", date: "2026-08-02", customer: "Hemant Soren", type: "WhatsApp", executive: "Vikram Singh", nextFollowUp: "2026-08-09", status: "Pending", notes: "Verify documentation status list." },
    { id: "F-30", date: "2026-08-03", customer: "Sukhvinder Sukhu", type: "Call", executive: "Rajesh Sharma", nextFollowUp: "2026-08-10", status: "Pending", notes: "Confirm payment validation check." }
  ];

  const STATUS_MASTER = [
    { id: "st1", name: "New", color: "badge-info" },
    { id: "st2", name: "Contacted", color: "badge-neutral" },
    { id: "st3", name: "Qualified", color: "badge-warning" },
    { id: "st4", name: "Site Visit Done", color: "badge-success" },
    { id: "st5", name: "Negotiation", color: "badge-danger" }
  ];

  const PROPERTY_TYPES = [
    { code: "1BHK", name: "1 Bedroom Hall Kitchen", range: "600 - 750 sq ft", basePrice: "₹45L - ₹60L" },
    { code: "2BHK", name: "2 Bedroom Hall Kitchen", range: "950 - 1300 sq ft", basePrice: "₹70L - ₹95L" },
    { code: "3BHK", name: "3 Bedroom Hall Kitchen", range: "1400 - 2100 sq ft", basePrice: "₹1.1Cr - ₹1.8Cr" },
    { code: "Penthouse", name: "Luxury Duplex Penthouse", range: "3500 - 4800 sq ft", basePrice: "₹2.2Cr - ₹3.5Cr" },
    { code: "Villa", name: "Independent Smart Villa", range: "3000 - 4500 sq ft", basePrice: "₹2.5Cr - ₹4.0Cr" }
  ];

  // MULTI-TENANT DATASET
  const TENANTS = [
    { id: "tenant-1", name: "Prestige Group", code: "PRESTIGE", tier: "Enterprise", rera: "RERA-KA-1002", activeUsers: 42, maxUsers: 100, storageUsed: 14.5, storageMax: 50, domain: "prestige.buildercrm.io", brandingColor: "#4f46e5", status: "Active", contactPerson: "Rajeev Prestige", contactEmail: "admin@prestige.com" },
    { id: "tenant-2", name: "DLF Limited", code: "DLF", tier: "Enterprise", rera: "RERA-HR-2009", activeUsers: 68, maxUsers: 200, storageUsed: 38.2, storageMax: 100, domain: "dlf.buildercrm.io", brandingColor: "#10b981", status: "Active", contactPerson: "Nikhil DLF", contactEmail: "admin@dlf.in" },
    { id: "tenant-3", name: "LODHA Group", code: "LODHA", tier: "Professional", rera: "RERA-MH-4012", activeUsers: 24, maxUsers: 50, storageUsed: 8.9, storageMax: 25, domain: "lodha.buildercrm.io", brandingColor: "#d97706", status: "Active", contactPerson: "Manoj Lodha", contactEmail: "it@lodha.com" },
    { id: "tenant-4", name: "Sobha Developers", code: "SOBHA", tier: "Professional", rera: "RERA-KA-3011", activeUsers: 18, maxUsers: 50, storageUsed: 6.4, storageMax: 25, domain: "sobha.buildercrm.io", brandingColor: "#e11d48", status: "Active", contactPerson: "Vikram Sobha", contactEmail: "support@sobha.com" },
    { id: "tenant-5", name: "Godrej Properties", code: "GODREJ", tier: "Basic", rera: "RERA-MH-5099", activeUsers: 8, maxUsers: 10, storageUsed: 1.8, storageMax: 5, domain: "godrej.buildercrm.io", brandingColor: "#0ea5e9", status: "Active", contactPerson: "Alok Godrej", contactEmail: "sales@godrejprop.com" }
  ];

  let activeTenantId = "tenant-1";

  // GLOBAL AUDIT LOGS
  const AUDIT_LOGS = [
    { date: "2026-07-15 22:10:14", tenant: "Prestige Group", user: "Rajesh Sharma", action: "Updated lead LD-1001 details", ip: "192.168.1.45", status: "Success" },
    { date: "2026-07-15 21:45:32", tenant: "DLF Limited", user: "Priya Patel", action: "Dispatched booking agreement for BK-9002", ip: "10.0.4.12", status: "Success" },
    { date: "2026-07-15 20:30:11", tenant: "LODHA Group", user: "Super Admin", action: "Updated tenant Lodha Group database limit to 25GB", ip: "192.168.0.2", status: "Success" },
    { date: "2026-07-15 19:15:00", tenant: "Sobha Developers", user: "Vikram Sobha", action: "Failed Login Attempt (Incorrect Credentials)", ip: "182.45.12.99", status: "Failed" },
    { date: "2026-07-15 18:00:22", tenant: "Prestige Group", user: "Rajeev Prestige", action: "Authorized custom domain mapping prestige.buildercrm.io", ip: "192.168.1.1", status: "Success" },
    { date: "2026-07-15 17:34:55", tenant: "Godrej Properties", user: "Alok Godrej", action: "Generated monthly bookings invoice portfolio", ip: "124.67.9.11", status: "Success" },
    { date: "2026-07-15 16:20:10", tenant: "DLF Limited", user: "Nikhil DLF", action: "Created new Sales Executive account", ip: "10.0.4.5", status: "Success" }
  ];

  // Helper APIs for CRUD emulation
  return {
    getProjects: () => PROJECTS,
    getExecutives: () => EXECUTIVES,
    getLeadSources: () => LEAD_SOURCES,
    getLostReasons: () => LOST_REASONS,
    getLeads: () => LEADS,
    getCustomers: () => CUSTOMERS,
    getClosedDeals: () => CLOSED_DEALS,
    getLostDeals: () => LOST_DEALS,
    getFollowUps: () => FOLLOW_UPS,
    getStatusMaster: () => STATUS_MASTER,
    getPropertyTypes: () => PROPERTY_TYPES,

    // Multi-tenant APIs
    getTenants: () => TENANTS,
    getActiveTenant: () => TENANTS.find(t => t.id === activeTenantId),
    setActiveTenant: (id) => {
      const tenant = TENANTS.find(t => t.id === id);
      if (tenant) {
        activeTenantId = id;
        return tenant;
      }
      return null;
    },
    addTenant: (tenant) => {
      const newId = `tenant-${TENANTS.length + 1}`;
      const newTenant = {
        id: newId,
        activeUsers: 1,
        storageUsed: 0.1,
        brandingColor: "#4f46e5",
        status: "Active",
        ...tenant
      };
      TENANTS.push(newTenant);
      return newTenant;
    },
    getAuditLogs: () => AUDIT_LOGS,
    addAuditLog: (action, user = "Super Admin", tenantName = "System") => {
      AUDIT_LOGS.unshift({
        date: new Date().toISOString().replace('T', ' ').substring(0, 19),
        tenant: tenantName,
        user: user,
        action: action,
        ip: "192.168.1.1",
        status: "Success"
      });
    },

    // Find APIs
    findLeadById: (id) => LEADS.find(l => l.id === id),
    findCustomerById: (id) => CUSTOMERS.find(c => c.id === id),
    findClosedDealByNo: (no) => CLOSED_DEALS.find(d => d.bookingNo === no),

    // Mutator Emulators
    addCustomer: (cust) => {
      const newId = `CUST-${5000 + CUSTOMERS.length + 1}`;
      const newCust = {
        id: newId,
        notes: "Manually registered active customer profile.",
        history: [{ date: new Date().toISOString().split('T')[0], detail: "Customer profile created manually." }],
        documents: ["PAN Card", "Aadhaar Card"],
        ...cust
      };
      CUSTOMERS.unshift(newCust);
      return newCust;
    },

    addLead: (lead) => {
      const newId = `LD-${1000 + LEADS.length + 1}`;
      const newLead = {
        id: newId,
        date: new Date().toISOString().split('T')[0],
        remarks: [],
        history: [{ date: new Date().toISOString().split('T')[0], type: "Created", detail: "Lead entered manually." }],
        ...lead
      };
      LEADS.unshift(newLead);
      return newLead;
    },

    convertLeadToCustomer: (leadId) => {
      const lead = LEADS.find(l => l.id === leadId);
      if (!lead) return null;

      // Check if already customer
      const exists = CUSTOMERS.find(c => c.email === lead.email);
      if (exists) return exists;

      const newId = `CUST-${5000 + CUSTOMERS.length + 1}`;
      const newCust = {
        id: newId,
        name: lead.name,
        contact: lead.mobile,
        email: lead.email,
        project: lead.project,
        budget: lead.budget,
        budgetValue: lead.budgetValue,
        executive: lead.executive,
        status: "Agreement Pending",
        address: "Indian Resident Address (Not Specified)",
        propInterest: { tower: "Tower A", flatNo: "Unassigned", config: "2BHK", area: "1200 sq ft", floor: "TBD" },
        notes: "Converted from Lead Profile.",
        history: [{ date: new Date().toISOString().split('T')[0], detail: "Lead converted to Customer registration." }],
        documents: ["PAN Card", "Aadhaar Card"]
      };
      CUSTOMERS.unshift(newCust);
      lead.status = "Converted";
      return newCust;
    },

    closeDeal: (booking) => {
      const newNo = `BK-${9000 + CLOSED_DEALS.length + 1}`;
      const newDeal = {
        bookingNo: newNo,
        agreementStatus: "Pending",
        registrationStatus: "Pending",
        paymentMilestones: [
          { milestone: "Booking Amount", percentage: "10%", amount: booking.bookingAmount, status: "Paid" },
          { milestone: "On Excavation", percentage: "10%", amount: "TBD", status: "Pending" },
          { milestone: "On Possession", percentage: "80%", amount: "TBD", status: "Pending" }
        ],
        ...booking
      };
      CLOSED_DEALS.unshift(newDeal);
      return newDeal;
    },

    markLeadLost: (leadId, reason, competitor) => {
      const lead = LEADS.find(l => l.id === leadId);
      if (!lead) return false;

      lead.status = "Lost";
      const newLost = {
        leadNo: lead.id,
        customer: lead.name,
        project: lead.project,
        lostDate: new Date().toISOString().split('T')[0],
        lostReason: reason,
        competitor: competitor || "Unknown",
        executive: lead.executive
      };
      LOST_DEALS.unshift(newLost);
      return true;
    }
  };
})();
