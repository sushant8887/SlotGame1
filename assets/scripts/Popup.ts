import { _decorator, Component, Label, Node, tween, Vec3 } from 'cc';
const { ccclass, property } = _decorator;

@ccclass('Popup')
export class Popup extends Component {
    @property(Label)
    messageLabel: Label = null;

    show(message: string) {
        this.messageLabel.string = message;
        this.node.active = true;
        this.node.scale = new Vec3(0, 0, 1);
        tween(this.node)
            .to(0.2, { scale: new Vec3(1, 1, 1) }, { easing: 'backOut' })
            .start();
    }
    

    hide() {
        this.node.active = false;
    }
}
