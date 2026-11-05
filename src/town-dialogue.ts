import { postUnread, type ResidentStory } from "./resident-story.ts";

type Reply = [label: string, next: string];
export interface TownPage {
  text: string;
  choices?: Reply[];
  speaker?: string;
  hint?: string;
  after?: { seconds: number; next: string };
  effect?: "deliver" | "pin" | "bouquet" | "reserve" | "taste";
}
const wardrobeHint = "可以打开背包查看目前拥有的饰品并进行更换";
const cakeChoices: Reply[] = [["现在尝一口", "eat"], ["帮我留一下", "covered"]];

// Page names double as visual cues. A destination beginning with @ leaves the
// conversation through the corresponding existing map, game or wardrobe control.
const scripts = {
  post: {
    start: { text: "把思念织进信里，就可以送给远方的Ta。乖乖，你也是来寄信的吗？", choices: [["不是哦，我只是凑巧走到这的", "letter"]] },
    letter: { text: "凑巧...（温柔笑笑）世间没有那么多凑巧，一切都是命中注定的缘分。", choices: [["继续", "delivered"]] },
    delivered: { text: "乖乖，属于你的缘分到了，回去看看吧，没事的话可以多回来看看我。", effect: "deliver" },
    unread: { text: "乖乖，那封信已经到了。路过小屋的时候，记得打开晚安信箱看看。" },
    read: { text: "乖乖，信收到了呀。下次路过，也回来陪我坐一会儿吧。" },
  },
  welcome: {
    start: { text: "......", choices: [["你好？", "silent"]] },
    silent: { text: "......", choices: [["你好？？", "awake"]] },
    awake: { text: "谁在叫我...？（抬头）哦哦...你好啊", choices: [["你在这里干什么呀？", "pin"]] },
    pin: { text: "（沉默了一会）我来接人，接芙眠眠大人。（盯着你看了一会）好像你就是芙眠眠欸。这个胸针给你，希望你会喜欢。", effect: "pin" },
    return: { text: "芙眠眠大人，这次我认得你啦。欢迎回来！" },
  },
  maker: {
    start: { text: "Wow, you look fantastic!（哇，你看起来太棒了）", choices: [["谢谢，但是你为什么要说英文？", "study"]] },
    study: { text: "因为我去外国进修过一段时间，为了做出更好的饰品！你知道自己很美对吧，but...你好像缺少了些什么。", choices: [["是什么呀？", "fit"], ["是脑子吗...阿巴阿巴（bushi）", "joke"]] },
    fit: { text: "独属于你的饰品！我愿意为你量身定做！", hint: wardrobeHint, choices: [["打开背包", "@bag"]] },
    joke: { text: "当然不是啦，你看起来那么聪明！是独属于你的饰品啦！我会为你量身定做的！", hint: wardrobeHint, choices: [["打开背包", "@bag"]] },
  },
  florist: {
    start: { text: "牡丹、玫瑰、向日葵、紫罗兰、雏菊，你喜欢哪种呀？", choices: [["继续", "show"]] },
    show: { text: "虽然不知道你喜欢什么花，但是我会把这束洋桔梗送给你，象征着芙妮宝真诚不变的爱。", choices: [["收下洋桔梗", "receive"]] },
    receive: { text: "（芙芙接过了系着缎带的洋桔梗。）", effect: "bouquet", choices: [["看看那束花", "@bouquet"]] },
    return: { text: "你来啦。那束洋桔梗，是我亲手为你挑的哦。", choices: [["看看那束花", "@bouquet"]] },
  },
  baker: {
    start: { text: "（拿出一块白板上面写着）你就是芙眠眠大人吗？", choices: [["是我哦。", "hand"]] },
    hand: { text: "（拿出一块草莓蛋糕放在你手上）", choices: [["这是给我的吗？", "offer"]] },
    offer: { text: "（点点头）（把白板上的字擦干净又重新写下）（这是芙妮宝让我为你做的，第一块当然是留给你的！希望你会喜欢）", choices: cakeChoices },
    covered: { text: "（栗栗给小碟盖上罩子，轻轻地点了点头。）", effect: "reserve" },
    reserved: { text: "给你留的第一块，要现在尝尝吗？", choices: cakeChoices },
    eat: { text: "（芙芙托起小碟，尝了两口草莓蛋糕。）", effect: "reserve", choices: [["跳过演出", "finished"]], after: { seconds: 3, next: "finished" } },
    finished: { text: "（芙芙朝栗栗弯起眼睛。栗栗翻过白板，上面画着一颗小草莓。）", effect: "taste" },
    return: { text: "（栗栗认出了你，笑着举起画了小草莓的白板。）" },
  },
  walker: {
    start: { text: "哇塞，大姐姐你好好看呀！你是从哪里来的呀？听说今天镇上会来一个大人物呢！你见过她了吗？", choices: [["我没见过哦", "invite"], ["我就是哦~", "reveal"]] },
    invite: { text: "好吧好吧，不知道她什么时候到呢！等她到了我们一起去接她！" },
    reveal: { text: "哇塞！！你就是传说中的芙眠眠大人吗？！难怪这么漂亮。（意识到自己说话有点直接）不好意思哦，嘿嘿。", choices: [["没关系哦，你很可爱呢", "blush"], ["有关系！（逗她）", "sorry"]] },
    blush: { text: "（脸红）谢谢，希望你可以玩的开心！" },
    sorry: { text: "姐姐我错啦呜呜~下次不敢了！" },
  },
  bunny: {
    start: { text: "（抱抱）", choices: [["你是哪家的宝宝？", "hug"], ["什么情况呀？", "hug"]] },
    hug: { text: "（不语，只是一味地抱着）", choices: [["继续", "intro"]], after: { seconds: 1.5, next: "intro" } },
    intro: { text: "ww忘记自我介绍了。我是月兔吉祥物，因为我软乎乎的，芙妮宝说让我代替他们来抱抱你。", choices: [["我收到啦，你的怀抱很温暖。", "release"]] },
    release: { text: "（乖乖抱着，好一会才放开）" },
  },
  "photo-visitor": {
    start: { text: "别动！！！（只是一味地拍拍拍）", choices: [["（乖乖不动）", "model"], ["（就动就动）", "move"]] },
    model: { text: "太好了，我很久没见到这么完美的模特了，你简直就是天使！", choices: [["没事，能帮到你我很开心", "thanks"]] },
    thanks: { text: "请你以后也常来做我的模特！" },
    move: { text: "啊！！怎么这样。我差一点...就差一点就抓拍到最完美的瞬间了！", choices: [["好吧，那我不动了", "reshoot"]] },
    reshoot: { text: "嗐，最美的那一瞬间已经消失了...不过无论如何都谢谢你，我很久没见到这么完美的模特了，请你以后也常来做我的模特。" },
  },
  "radio-host": {
    start: { text: "你是芙眠眠大人吗？欢迎你来到小镇。实不相瞒，我是小镇晚安电台的新人主持，直播和电台有一定相同点，你愿意分享一些经验给我吗？", choices: [["用很多的真心和爱去认真对待听众就好啦", "notes"], ["其实我没有什么经验，我很幸运遇到了一群爱我的人。", "author"]] },
    notes: { text: "我记下了，我会努力的！" },
    author: { speaker: "作者的话", text: "其实是因为芙芙本身就很好，所以才能吸引到很好的芙妮宝们！你做的比自己想象的更好更多，现在的结果并不是运气使然，而是因为芙芙值得被爱。" },
  },
  books: {
    start: { text: "安好，敢问君可是来借阅书卷？", choices: [["我路过看到这间书屋，便来瞧瞧看。", "marked"]] },
    marked: { text: "原并非为借书而来，可我分明觉出，你已藏有一卷属于自己的书。", choices: [["是什么书呀？", "blessing"]] },
    blessing: { text: "此卷便是同心爱之人共书、唤作回忆的篇章。贺君岁岁平安，安然度过这一年。" },
  },
  cat: {
    start: { text: "（这是一只打着领结看起来很端正的小猫）", choices: [["尝试着摸摸它", "rub"], ["还是不要打扰它了，可能比较高冷", "walk"]] },
    rub: { text: "（没想到它与外表不符，格外喜欢你的抚摸，并主动蹭蹭你。）" },
    walk: { text: "（看了你一会，离开了）" },
  },
  "hop-keeper": {
    start: { text: "世人皆知嫦娥奔月，却少有人知古人观影成兔。那里有个月兔台，说不定能看到可爱的月兔呢。", choices: [["去玩月兔跳一跳", "@game"]] },
  },
  "flight-keeper": {
    start: { text: "每一次的轻轻振翅，都会离星星更近一点。就像你的每一步，最后都会慢慢和芙妮宝交汇。", choices: [["去玩芙芙晚安飞行", "@game"]] },
  },
  "blocks-keeper": {
    start: { text: "零零碎碎的事情拼凑在一起，就组成了这难忘的一年。消去的是过去的烦恼，留下的是现在的美好，将要落下的是未来的期望。", choices: [["去玩晚安方块", "@game"]] },
  },
  "snake-keeper": {
    start: { text: "回声遗迹的门终于开了，听说就在不远处。遗迹里有一条玉蛇，体长可至常人难以想象的地步，要我带你去看看吗？", choices: [["去看看，去玩苔纹贪吃蛇", "@game"], ["谢谢你哦，我还想到处逛逛。", "@decline"]] },
  },
} satisfies Record<string, Record<string, TownPage>>;

export type TownResidentId = keyof typeof scripts;
export const townDialogues: Record<TownResidentId, Record<string, TownPage>> = scripts;

export function residentOpening(id: TownResidentId, story: ResidentStory, hasBouquet: boolean) {
  if (id === "post" && story.postDelivered)
    return postUnread(story) ? "unread" : "read";
  if (id === "welcome" && story.welcomeReceived) return "return";
  if (id === "florist" && hasBouquet) return "return";
  if (id === "baker" && story.cake !== "new") return story.cake === "reserved" ? "reserved" : "return";
  return "start";
}
